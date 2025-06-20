import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WsException,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { Logger, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { WsJwtGuard } from "./guards/ws-jwt.guard"
import { WsThrottlerGuard } from "./guards/ws-throttler.guard"
import { AuctionRoomGuard } from "./guards/auction-room.guard"
import { WebSocketService } from "./websocket.service"
import { AuctionRoomService } from "./services/auction-room.service"
import { BidValidationPipe } from "./pipes/bid-validation.pipe"
import { JoinRoomDto, PlaceBidDto, LeaveRoomDto } from "./dto/websocket.dto"

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
      ]
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
  },
  namespace: "/",
  transports: ["websocket", "polling"],
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebsocketGateway.name)

  @WebSocketServer()
  server: Server

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly websocketService: WebSocketService,
    private readonly auctionRoomService: AuctionRoomService,
  ) {}

  afterInit(server: Server) {
    this.logger.log("WebSocket Gateway initialized")
    this.websocketService.setServer(server)

    // Initialize auction room management
    this.auctionRoomService.initialize(server)

    const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:5173"
    this.logger.log(`CORS allowed origins: ${frontendUrl}`)
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting connection: ${client.id}`)

      // Authenticate client
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(" ")[1]

      if (!token) {
        this.logger.warn(`Client ${client.id} not authenticated`)
        client.disconnect()
        return
      }

      const payload = this.jwtService.verify(token)
      client.data.user = payload

      // Register client with WebSocket service
      await this.websocketService.registerClient(client, payload)

      this.logger.log(`Client ${client.id} authenticated as user ${payload.sub}`)

      // Send connection confirmation
      client.emit("connected", {
        message: "Successfully connected to auction system",
        userId: payload.sub,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message)
      client.emit("error", { message: "Authentication failed" })
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnecting: ${client.id}`)

    try {
      // Clean up client from all rooms and services
      await this.websocketService.unregisterClient(client)
      await this.auctionRoomService.removeClientFromAllRooms(client)

      this.logger.log(`Client ${client.id} cleanup completed`)
    } catch (error) {
      this.logger.error(`Error during client ${client.id} cleanup:`, error)
    }
  }

  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage("joinAuction")
  async handleJoinAuction(client: Socket, data: JoinRoomDto) {
    try {
      const { auctionId } = data
      const userId = client.data.user.sub

      this.logger.log(`User ${userId} joining auction room: ${auctionId}`)

      // Join auction room with validation
      const roomInfo = await this.auctionRoomService.joinAuctionRoom(client, auctionId, userId)

      // Send room information to client
      client.emit("joinedAuction", {
        auctionId,
        roomInfo,
        timestamp: new Date().toISOString(),
      })

      // Notify other room members
      client.to(`auction:${auctionId}`).emit("userJoined", {
        userId,
        username: client.data.user.email,
        participantCount: roomInfo.participantCount,
        timestamp: new Date().toISOString(),
      })

      return { success: true, roomInfo }
    } catch (error) {
      this.logger.error(`Error joining auction room:`, error)
      throw new WsException(error.message || "Failed to join auction room")
    }
  }

  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage("leaveAuction")
  async handleLeaveAuction(client: Socket, data: LeaveRoomDto) {
    try {
      const { auctionId } = data
      const userId = client.data.user.sub

      this.logger.log(`User ${userId} leaving auction room: ${auctionId}`)

      // Leave auction room
      await this.auctionRoomService.leaveAuctionRoom(client, auctionId, userId)

      // Notify other room members
      client.to(`auction:${auctionId}`).emit("userLeft", {
        userId,
        username: client.data.user.email,
        timestamp: new Date().toISOString(),
      })

      client.emit("leftAuction", {
        auctionId,
        timestamp: new Date().toISOString(),
      })

      return { success: true }
    } catch (error) {
      this.logger.error(`Error leaving auction room:`, error)
      throw new WsException(error.message || "Failed to leave auction room")
    }
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard, AuctionRoomGuard)
  @UsePipes(new BidValidationPipe())
  @SubscribeMessage("placeBid")
  async handlePlaceBid(@ConnectedSocket() client: Socket, @MessageBody() data: PlaceBidDto) {
    try {
      const { auctionId, amount } = data
      const userId = client.data.user.sub

      this.logger.log(`Bid attempt from ${userId} for auction ${auctionId}: $${amount}`)

      // Process bid through auction room service
      const bidResult = await this.auctionRoomService.processBid(client, auctionId, userId, amount)

      // Broadcast bid to all room participants
      this.server.to(`auction:${auctionId}`).emit("bidPlaced", {
        bidId: bidResult.bid.id,
        auctionId,
        userId,
        username: client.data.user.email,
        amount,
        timestamp: bidResult.bid.createdAt,
        isHighest: true,
        previousHighest: bidResult.previousHighest,
      })

      // Send confirmation to bidder
      client.emit("bidConfirmed", {
        bidId: bidResult.bid.id,
        amount,
        position: bidResult.position,
        timestamp: bidResult.bid.createdAt,
      })

      return { success: true, bid: bidResult.bid }
    } catch (error) {
      this.logger.error(`Bid placement error:`, error)

      // Send error to client
      client.emit("bidError", {
        auctionId: data.auctionId,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      throw new WsException(error.message || "Failed to place bid")
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("getAuctionStatus")
  async handleGetAuctionStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    try {
      const status = await this.auctionRoomService.getAuctionStatus(data.auctionId)

      client.emit("auctionStatus", {
        auctionId: data.auctionId,
        status,
        timestamp: new Date().toISOString(),
      })

      return { success: true, status }
    } catch (error) {
      this.logger.error(`Error getting auction status:`, error)
      throw new WsException(error.message || "Failed to get auction status")
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("getRoomParticipants")
  async handleGetRoomParticipants(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    try {
      const participants = await this.auctionRoomService.getRoomParticipants(data.auctionId)

      client.emit("roomParticipants", {
        auctionId: data.auctionId,
        participants,
        count: participants.length,
        timestamp: new Date().toISOString(),
      })

      return { success: true, participants }
    } catch (error) {
      this.logger.error(`Error getting room participants:`, error)
      throw new WsException(error.message || "Failed to get room participants")
    }
  }

  // Admin methods for auction management
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("startAuction")
  async handleStartAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    try {
      // Verify user is auction owner or admin
      const canStart = await this.auctionRoomService.canUserStartAuction(data.auctionId, client.data.user.sub)

      if (!canStart) {
        throw new WsException("Unauthorized to start this auction")
      }

      await this.auctionRoomService.startAuction(data.auctionId)

      // Broadcast to all room participants
      this.server.to(`auction:${data.auctionId}`).emit("auctionStarted", {
        auctionId: data.auctionId,
        startedBy: client.data.user.sub,
        timestamp: new Date().toISOString(),
      })

      return { success: true }
    } catch (error) {
      this.logger.error(`Error starting auction:`, error)
      throw new WsException(error.message || "Failed to start auction")
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("endAuction")
  async handleEndAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    try {
      // Verify user is auction owner or admin
      const canEnd = await this.auctionRoomService.canUserEndAuction(data.auctionId, client.data.user.sub)

      if (!canEnd) {
        throw new WsException("Unauthorized to end this auction")
      }

      const result = await this.auctionRoomService.endAuction(data.auctionId)

      // Broadcast to all room participants
      this.server.to(`auction:${data.auctionId}`).emit("auctionEnded", {
        auctionId: data.auctionId,
        winner: result.winner,
        winningBid: result.currentBid,
        endedBy: client.data.user.sub,
        timestamp: new Date().toISOString(),
      })

      return { success: true, result }
    } catch (error) {
      this.logger.error(`Error ending auction:`, error)
      throw new WsException(error.message || "Failed to end auction")
    }
  }

  broadcastBidUpdate(auctionId: string, bidData: any): void {
    if (this.server) {
      this.server.to(`auction:${auctionId}`).emit("bidPlaced", bidData)
    }
  }
}

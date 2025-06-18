import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WsException,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { Logger, UseGuards } from "@nestjs/common"
import type { RedisService } from "../redis/redis.service"
import type { JwtService } from "@nestjs/jwt"
import type { ConfigService } from "@nestjs/config"
import { WsJwtGuard } from "./guards/ws-jwt.guard"
import { WsThrottlerGuard } from "./guards/ws-throttler.guard"

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:3000", // Additional fallback
        "http://localhost:5173", // Vite default
      ]
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebsocketGateway.name)

  @WebSocketServer()
  server: Server

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log("WebSocket Gateway initialized")
    this.logger.log(`CORS allowed origins: ${this.configService.get("FRONTEND_URL") || "http://localhost:5173"}`)

    // Subscribe to Redis channels for real-time updates
    this.redisService.subscribe("auction:bid", (message) => {
      try {
        const data = JSON.parse(message)
        this.server.to(`auction:${data.auctionId}`).emit("bidPlaced", data)
      } catch (error) {
        this.logger.error("Error processing Redis message", error)
      }
    })

    this.redisService.subscribe("auction:status", (message) => {
      try {
        const data = JSON.parse(message)
        this.server.to(`auction:${data.auctionId}`).emit("auctionUpdate", data)
      } catch (error) {
        this.logger.error("Error processing Redis message", error)
      }
    })
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)

    // Authenticate client
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(" ")[1]

    if (!token) {
      this.logger.warn(`Client ${client.id} not authenticated`)
      return
    }

    try {
      const payload = this.jwtService.verify(token)
      client.data.user = payload
      this.logger.log(`Client ${client.id} authenticated as user ${payload.sub}`)
    } catch (error) {
      this.logger.warn(`Client ${client.id} provided invalid token`)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)

    // Leave all rooms
    for (const room of client.rooms) {
      if (room !== client.id) {
        client.leave(room)
      }
    }
  }

  @SubscribeMessage("joinAuction")
  handleJoinAuction(client: Socket, auctionId: string) {
    this.logger.log(`Client ${client.id} joining auction room: ${auctionId}`)
    client.join(`auction:${auctionId}`)
    return { event: "joinedAuction", data: { auctionId } }
  }

  @SubscribeMessage("leaveAuction")
  handleLeaveAuction(client: Socket, auctionId: string) {
    this.logger.log(`Client ${client.id} leaving auction room: ${auctionId}`)
    client.leave(`auction:${auctionId}`)
    return { event: "leftAuction", data: { auctionId } }
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage("placeBid")
  handlePlaceBid(client: Socket, data: { auctionId: string; amount: number }) {
    if (!client.data.user) {
      throw new WsException("Unauthorized")
    }

    this.logger.log(`Bid attempt from ${client.data.user.sub} for auction ${data.auctionId}: $${data.amount}`)
    return { event: "bidReceived", data: { auctionId: data.auctionId } }
  }

  broadcastBidUpdate(auctionId: string, bid: any) {
    this.server.to(`auction:${auctionId}`).emit("bidPlaced", bid)
  }

  broadcastAuctionUpdate(auctionId: string, status: string) {
    this.server.to(`auction:${auctionId}`).emit("auctionUpdate", {
      auctionId,
      status,
      timestamp: new Date(),
    })
  }

  broadcastAuctionEnd(auctionId: string, winnerId: string, winningBid: number) {
    this.server.to(`auction:${auctionId}`).emit("auctionEnded", {
      auctionId,
      winnerId,
      winningBid,
      timestamp: new Date(),
    })
  }
}

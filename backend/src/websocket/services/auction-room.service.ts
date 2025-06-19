import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type { Server, Socket } from "socket.io"
import type { PrismaService } from "../../prisma/prisma.service"
import type { RedisService } from "../../redis/redis.service"
import type { BidService } from "../../bid/bid.service"
import type { AuctionService } from "../../auction/auction.service"
import type { WebSocketService } from "../websocket.service"

interface AuctionRoom {
  auctionId: string
  participants: Map<string, { userId: string; socketId: string; joinedAt: Date }>
  currentHighestBid: number | null
  bidCount: number
  status: string
  createdAt: Date
  lastActivity: Date
}

interface BidResult {
  bid: any
  position: number
  previousHighest: number | null
}

@Injectable()
export class AuctionRoomService {
  private readonly logger = new Logger(AuctionRoomService.name)
  private server: Server
  private auctionRooms = new Map<string, AuctionRoom>()

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly bidService: BidService,
    private readonly auctionService: AuctionService,
    private readonly websocketService: WebSocketService,
  ) {}

  initialize(server: Server) {
    this.server = server
    this.logger.log("Auction Room Service initialized")
  }

  async joinAuctionRoom(socket: Socket, auctionId: string, userId: string) {
    // Validate auction exists and is accessible
    const auction = await this.validateAuction(auctionId)

    // Get or create auction room
    let room = this.auctionRooms.get(auctionId)
    if (!room) {
      room = await this.createAuctionRoom(auctionId, auction)
    }

    // Check if user is already in room
    const existingParticipant = Array.from(room.participants.values()).find((p) => p.userId === userId)

    if (existingParticipant) {
      // Update socket ID for existing participant
      room.participants.set(socket.id, {
        userId,
        socketId: socket.id,
        joinedAt: existingParticipant.joinedAt,
      })
    } else {
      // Add new participant
      room.participants.set(socket.id, {
        userId,
        socketId: socket.id,
        joinedAt: new Date(),
      })
    }

    // Join socket room
    socket.join(`auction:${auctionId}`)
    this.websocketService.addClientToRoom(socket.id, `auction:${auctionId}`)

    room.lastActivity = new Date()

    // Cache room info in Redis
    await this.cacheRoomInfo(auctionId, room)

    this.logger.log(`User ${userId} joined auction room ${auctionId}`)

    return {
      auctionId,
      participantCount: room.participants.size,
      currentHighestBid: room.currentHighestBid,
      bidCount: room.bidCount,
      status: room.status,
    }
  }

  async leaveAuctionRoom(socket: Socket, auctionId: string, userId: string) {
    const room = this.auctionRooms.get(auctionId)
    if (!room) return

    // Remove participant
    room.participants.delete(socket.id)

    // Leave socket room
    socket.leave(`auction:${auctionId}`)
    this.websocketService.removeClientFromRoom(socket.id, `auction:${auctionId}`)

    room.lastActivity = new Date()

    // Update cache
    await this.cacheRoomInfo(auctionId, room)

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.auctionRooms.delete(auctionId)
      await this.redisService.del(`auction:room:${auctionId}`)
    }

    this.logger.log(`User ${userId} left auction room ${auctionId}`)
  }

  async removeClientFromAllRooms(socket: Socket) {
    for (const [auctionId, room] of this.auctionRooms.entries()) {
      if (room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id)!
        await this.leaveAuctionRoom(socket, auctionId, participant.userId)
      }
    }
  }

  async processBid(socket: Socket, auctionId: string, userId: string, amount: number): Promise<BidResult> {
    const room = this.auctionRooms.get(auctionId)
    if (!room) {
      throw new BadRequestException("Auction room not found")
    }

    // Validate auction is active
    if (room.status !== "ACTIVE") {
      throw new BadRequestException("Auction is not active")
    }

    // Get current highest bid for comparison
    const previousHighest = room.currentHighestBid

    try {
      // Place bid through bid service (handles validation and database)
      const bid = await this.bidService.create({ auctionId, amount }, userId)

      // Update room state
      room.currentHighestBid = amount
      room.bidCount += 1
      room.lastActivity = new Date()

      // Cache updated room info
      await this.cacheRoomInfo(auctionId, room)

      // Cache highest bid in Redis for fast access
      await this.redisService.cacheHighestBid(auctionId, amount, userId)

      this.logger.log(`Bid processed: ${amount} by ${userId} in auction ${auctionId}`)

      return {
        bid,
        position: 1, // Always highest since we just placed it
        previousHighest,
      }
    } catch (error) {
      this.logger.error(`Bid processing failed:`, error)
      throw error
    }
  }

  async getAuctionStatus(auctionId: string) {
    const room = this.auctionRooms.get(auctionId)

    if (room) {
      return {
        status: room.status,
        participantCount: room.participants.size,
        currentHighestBid: room.currentHighestBid,
        bidCount: room.bidCount,
        lastActivity: room.lastActivity,
      }
    }

    // If room not in memory, get from database
    const auction = await this.prismaService.auction.findUnique({
      where: { id: auctionId },
      include: { _count: { select: { bids: true } } },
    })

    if (!auction) {
      throw new NotFoundException("Auction not found")
    }

    return {
      status: auction.status,
      participantCount: 0,
      currentHighestBid: auction.currentBid,
      bidCount: auction._count.bids,
      lastActivity: auction.updatedAt,
    }
  }

  async getRoomParticipants(auctionId: string) {
    const room = this.auctionRooms.get(auctionId)
    if (!room) return []

    return Array.from(room.participants.values()).map((p) => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
    }))
  }

  async canUserStartAuction(auctionId: string, userId: string): Promise<boolean> {
    const auction = await this.prismaService.auction.findUnique({
      where: { id: auctionId },
    })

    return auction?.ownerId === userId
  }

  async canUserEndAuction(auctionId: string, userId: string): Promise<boolean> {
    const auction = await this.prismaService.auction.findUnique({
      where: { id: auctionId },
    })

    return auction?.ownerId === userId
  }

  async startAuction(auctionId: string) {
    const result = await this.auctionService.startAuction(auctionId)

    // Update room status
    const room = this.auctionRooms.get(auctionId)
    if (room) {
      room.status = "ACTIVE"
      room.lastActivity = new Date()
      await this.cacheRoomInfo(auctionId, room)
    }

    return result
  }

  async endAuction(auctionId: string) {
    const result = await this.auctionService.endAuction(auctionId)

    // Update room status
    const room = this.auctionRooms.get(auctionId)
    if (room) {
      room.status = "ENDED"
      room.lastActivity = new Date()
      await this.cacheRoomInfo(auctionId, room)
    }

    return result
  }

  private async validateAuction(auctionId: string) {
    const auction = await this.prismaService.auction.findUnique({
      where: { id: auctionId },
      include: { car: true },
    })

    if (!auction) {
      throw new NotFoundException("Auction not found")
    }

    return auction
  }

  private async createAuctionRoom(auctionId: string, auction: any): Promise<AuctionRoom> {
    const room: AuctionRoom = {
      auctionId,
      participants: new Map(),
      currentHighestBid: auction.currentBid,
      bidCount: 0,
      status: auction.status,
      createdAt: new Date(),
      lastActivity: new Date(),
    }

    this.auctionRooms.set(auctionId, room)

    // Get bid count from database
    const bidCount = await this.prismaService.bid.count({
      where: { auctionId },
    })
    room.bidCount = bidCount

    this.logger.log(`Created auction room for ${auctionId}`)

    return room
  }

  private async cacheRoomInfo(auctionId: string, room: AuctionRoom) {
    const roomInfo = {
      auctionId: room.auctionId,
      participantCount: room.participants.size,
      currentHighestBid: room.currentHighestBid,
      bidCount: room.bidCount,
      status: room.status,
      lastActivity: room.lastActivity.toISOString(),
    }

    await this.redisService.set(
      `auction:room:${auctionId}`,
      JSON.stringify(roomInfo),
      300, // 5 minutes TTL
    )
  }

  // Cleanup and maintenance methods
  async cleanupInactiveRooms() {
    const now = new Date()
    const inactiveThreshold = 60 * 60 * 1000 // 1 hour

    for (const [auctionId, room] of this.auctionRooms.entries()) {
      if (now.getTime() - room.lastActivity.getTime() > inactiveThreshold) {
        this.logger.warn(`Cleaning up inactive auction room: ${auctionId}`)
        this.auctionRooms.delete(auctionId)
        await this.redisService.del(`auction:room:${auctionId}`)
      }
    }
  }

  getRoomStats() {
    return {
      totalRooms: this.auctionRooms.size,
      totalParticipants: Array.from(this.auctionRooms.values()).reduce((sum, room) => sum + room.participants.size, 0),
      activeRooms: Array.from(this.auctionRooms.values()).filter((room) => room.status === "ACTIVE").length,
    }
  }
}

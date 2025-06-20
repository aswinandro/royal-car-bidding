import { Injectable, Logger } from "@nestjs/common"
import { Server, Socket } from "socket.io"
import { RedisService } from "../redis/redis.service"

interface ConnectedClient {
  socket: Socket
  userId: string
  connectedAt: Date
  lastActivity: Date
  rooms: Set<string>
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name)
  private server: Server
  private connectedClients = new Map<string, ConnectedClient>()
  private userSockets = new Map<string, Set<string>>() // userId -> Set of socketIds

  constructor(private readonly redisService: RedisService) {}

  setServer(server: Server) {
    this.server = server
  }

  async registerClient(socket: Socket, user: any): Promise<void> {
    const clientInfo: ConnectedClient = {
      socket,
      userId: user.sub,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
    }

    this.connectedClients.set(socket.id, clientInfo)

    // Track user's sockets
    if (!this.userSockets.has(user.sub)) {
      this.userSockets.set(user.sub, new Set())
    }
    this.userSockets.get(user.sub)!.add(socket.id)

    // Store in Redis for scaling across multiple instances
    await this.redisService.set(
      `ws:client:${socket.id}`,
      JSON.stringify({
        userId: user.sub,
        connectedAt: clientInfo.connectedAt.toISOString(),
      }),
      3600, // 1 hour TTL
    )

    this.logger.log(`Client registered: ${socket.id} for user ${user.sub}`)
  }

  async unregisterClient(socket: Socket): Promise<void> {
    const clientInfo = this.connectedClients.get(socket.id)

    if (clientInfo) {
      // Remove from user's socket set
      const userSockets = this.userSockets.get(clientInfo.userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          this.userSockets.delete(clientInfo.userId)
        }
      }

      // Leave all rooms
      for (const room of clientInfo.rooms) {
        socket.leave(room)
      }

      this.connectedClients.delete(socket.id)
    }

    // Remove from Redis
    await this.redisService.del(`ws:client:${socket.id}`)

    this.logger.log(`Client unregistered: ${socket.id}`)
  }

  getConnectedClient(socketId: string): ConnectedClient | undefined {
    return this.connectedClients.get(socketId)
  }

  getUserSockets(userId: string): Socket[] {
    const socketIds = this.userSockets.get(userId)
    if (!socketIds) return []

    return Array.from(socketIds)
      .map((id) => this.connectedClients.get(id)?.socket)
      .filter(Boolean) as Socket[]
  }

  addClientToRoom(socketId: string, room: string): void {
    const client = this.connectedClients.get(socketId)
    if (client) {
      client.rooms.add(room)
      client.lastActivity = new Date()
    }
  }

  removeClientFromRoom(socketId: string, room: string): void {
    const client = this.connectedClients.get(socketId)
    if (client) {
      client.rooms.delete(room)
      client.lastActivity = new Date()
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  getRoomParticipants(room: string): ConnectedClient[] {
    return Array.from(this.connectedClients.values()).filter((client) => client.rooms.has(room))
  }

  async broadcastToRoom(room: string, event: string, data: any): Promise<void> {
    if (this.server) {
      this.server.to(room).emit(event, data)

      // Also publish to Redis for other instances
      await this.redisService.publish(
        `ws:room:${room}`,
        JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        }),
      )
    }
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    const userSockets = this.getUserSockets(userId)

    for (const socket of userSockets) {
      socket.emit(event, data)
    }

    // Also publish to Redis for other instances
    await this.redisService.publish(
      `ws:user:${userId}`,
      JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    )
  }

  // Health check and cleanup methods
  async cleanupInactiveClients(): Promise<void> {
    const now = new Date()
    const inactiveThreshold = 30 * 60 * 1000 // 30 minutes

    for (const [socketId, client] of this.connectedClients.entries()) {
      if (now.getTime() - client.lastActivity.getTime() > inactiveThreshold) {
        this.logger.warn(`Cleaning up inactive client: ${socketId}`)
        client.socket.disconnect()
        await this.unregisterClient(client.socket)
      }
    }
  }

  getServerStats() {
    return {
      connectedClients: this.getConnectedClientsCount(),
      connectedUsers: this.getConnectedUsersCount(),
      rooms: Array.from(this.connectedClients.values())
        .flatMap((client) => Array.from(client.rooms))
        .filter((room, index, arr) => arr.indexOf(room) === index),
    }
  }
}

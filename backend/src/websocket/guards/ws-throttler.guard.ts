import { type CanActivate, type ExecutionContext, Injectable, Logger } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import type { Socket } from "socket.io"
import type { RedisService } from "../../redis/redis.service"

@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(WsThrottlerGuard.name)
  private readonly ttl = 1 // 1 second
  private readonly limit = 5 // 5 requests per second

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()
    const userId = client.data.user?.sub || client.handshake.address
    const event = context.getHandler().name

    const key = `throttle:ws:${userId}:${event}`

    try {
      // Get current count
      const current = await this.redisService.get(key)
      const count = current ? Number.parseInt(current, 10) : 0

      if (count >= this.limit) {
        this.logger.warn(`Rate limit exceeded for ${userId} on ${event}`)
        throw new WsException("Too many requests")
      }

      // Increment count
      if (count === 0) {
        await this.redisService.set(key, "1", this.ttl)
      } else {
        await this.redisService.getClient().incr(key)
      }

      return true
    } catch (error) {
      if (error instanceof WsException) {
        throw error
      }
      this.logger.error("WS Throttler Guard Error", error)
      return false
    }
  }
}

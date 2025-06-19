import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { RabbitMQService, BidMessage } from "../rabbitmq.service"
import type { BidService } from "../../bid/bid.service"
import type { WebsocketGateway } from "../../websocket/websocket.gateway"
import type { RedisService } from "../../redis/redis.service"

@Injectable()
export class BidProcessorService implements OnModuleInit {
  private readonly logger = new Logger(BidProcessorService.name)

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly bidService: BidService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Start consuming bid processing queues
    await this.startBidProcessing()
    await this.startPriorityBidProcessing()
  }

  private async startBidProcessing() {
    await this.rabbitmqService.consumeBidProcessingQueue(async (bidMessage: BidMessage) => {
      await this.processBid(bidMessage)
    })

    this.logger.log("Started consuming bid processing queue")
  }

  private async startPriorityBidProcessing() {
    await this.rabbitmqService.consumeBidPriorityQueue(async (bidMessage: BidMessage) => {
      await this.processBid(bidMessage, true)
    })

    this.logger.log("Started consuming priority bid processing queue")
  }

  private async processBid(bidMessage: BidMessage, isPriority = false) {
    const { bidId, userId, auctionId, amount } = bidMessage

    try {
      this.logger.log(`Processing ${isPriority ? "priority " : ""}bid: ${bidId}`)

      // Validate bid using Redis lock to prevent race conditions
      const lockKey = `bid:lock:${auctionId}`
      const lockAcquired = await this.acquireLock(lockKey, 5000) // 5 second lock

      if (!lockAcquired) {
        throw new Error("Could not acquire bid processing lock")
      }

      try {
        // Get current highest bid
        const currentHighest = await this.bidService.getHighestBid(auctionId)
        const minBidAmount = currentHighest ? currentHighest.amount + 1 : 0

        if (amount < minBidAmount) {
          throw new Error(`Bid amount ${amount} is too low. Minimum: ${minBidAmount}`)
        }

        // Process the bid
        const bid = await this.bidService.create({ auctionId, amount }, userId)

        // Update Redis cache
        await this.redisService.cacheHighestBid(auctionId, amount, userId)

        // Broadcast to WebSocket clients
        this.websocketGateway.broadcastBidUpdate(auctionId, {
          bidId: bid.id,
          userId,
          auctionId,
          amount,
          timestamp: bid.createdAt,
          isPriority,
        })

        // Send notifications
        await this.sendBidNotifications(bid, auctionId)

        // Log audit event
        await this.rabbitmqService.publishAuditEvent({
          eventType: "bid_processed",
          userId,
          auctionId,
          bidId: bid.id,
          data: { amount, isPriority },
          timestamp: new Date().toISOString(),
        })

        this.logger.log(`Bid processed successfully: ${bidId}`)
      } finally {
        await this.releaseLock(lockKey)
      }
    } catch (error) {
      this.logger.error(`Error processing bid ${bidId}:`, error)

      // Send error notification to user
      await this.rabbitmqService.publishNotification({
        userId,
        type: "bid_placed",
        title: "Bid Failed",
        message: `Your bid of $${amount} could not be processed: ${error.message}`,
        data: { auctionId, amount, error: error.message },
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }

  private async sendBidNotifications(bid: any, auctionId: string) {
    // Notify the bidder
    await this.rabbitmqService.publishNotification({
      userId: bid.userId,
      type: "bid_placed",
      title: "Bid Placed Successfully",
      message: `Your bid of $${bid.amount} has been placed successfully`,
      data: { auctionId, bidId: bid.id, amount: bid.amount },
      timestamp: new Date().toISOString(),
    })

    // Notify other participants (broadcast)
    await this.rabbitmqService.broadcastNotification({
      type: "bid_placed",
      title: "New Bid Placed",
      message: `A new bid of $${bid.amount} has been placed`,
      data: { auctionId, amount: bid.amount },
      timestamp: new Date().toISOString(),
    })
  }

  private async acquireLock(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redisService.getClient().set(key, "1", "PX", ttl, "NX")
      return result === "OK"
    } catch (error) {
      this.logger.error(`Error acquiring lock ${key}:`, error)
      return false
    }
  }

  private async releaseLock(key: string): Promise<void> {
    try {
      await this.redisService.del(key)
    } catch (error) {
      this.logger.error(`Error releasing lock ${key}:`, error)
    }
  }
}

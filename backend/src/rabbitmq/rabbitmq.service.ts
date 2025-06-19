import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { connect, type Connection, type ConfirmChannel, type ConsumeMessage, type Options } from "amqplib"

export interface BidMessage {
  bidId: string
  userId: string
  auctionId: string
  amount: number
  timestamp: string
  retryCount?: number
}

export interface AuctionEventMessage {
  auctionId: string
  eventType: "started" | "ended" | "updated" | "created" | "deleted"
  data: any
  timestamp: string
  userId?: string
  retryCount?: number
}

export interface NotificationMessage {
  userId: string
  type: "bid_placed" | "auction_won" | "auction_lost" | "auction_started" | "auction_ended"
  title: string
  message: string
  data: any
  timestamp: string
}

export interface AuditMessage {
  eventType: string
  userId?: string
  auctionId?: string
  bidId?: string
  data: any
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name)
  private connection: Connection | null = null
  private channel: ConfirmChannel | null = null
  private readonly maxRetries = 3
  private readonly retryDelay = 5000 // 5 seconds

  // Exchange names
  private readonly AUCTION_EXCHANGE = "auction.events"
  private readonly NOTIFICATION_EXCHANGE = "notifications"
  private readonly AUDIT_EXCHANGE = "audit.events"

  // Queue names
  private readonly BID_PROCESSING_QUEUE = "bid.processing"
  private readonly BID_PRIORITY_QUEUE = "bid.priority"
  private readonly NOTIFICATION_QUEUE = "notification.queue"
  private readonly AUDIT_QUEUE = "audit.queue"
  private readonly DEAD_LETTER_QUEUE = "dead.letter.queue"
  private readonly RETRY_QUEUE = "retry.queue"

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.connect()
      this.logger.log("RabbitMQ service initialized successfully")
    } catch (error) {
      this.logger.error("Failed to initialize RabbitMQ service", error)
      throw error
    }
  }

  async onModuleDestroy() {
    try {
      await this.disconnect()
      this.logger.log("RabbitMQ connections closed")
    } catch (error) {
      this.logger.error("Error closing RabbitMQ connections", error)
    }
  }

  private async connect(): Promise<void> {
    const rabbitmqUrl = this.configService.get("RABBITMQ_URL") || "amqp://localhost:5672"
    const username = this.configService.get("RABBITMQ_USERNAME") || "guest"
    const password = this.configService.get("RABBITMQ_PASSWORD") || "guest"

    this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}`)

    // Build connection URL with credentials
    const connectionUrl = rabbitmqUrl.includes("@")
      ? rabbitmqUrl
      : rabbitmqUrl.replace("amqp://", `amqp://${username}:${password}@`)

    try {
      // Connect to RabbitMQ
      this.connection = await connect(connectionUrl, {
        heartbeat: 60,
      })

      // Create confirm channel for reliable message delivery
      this.channel = await this.connection.createConfirmChannel()
      await this.channel.prefetch(10) // Process 10 messages at a time

      // Setup exchanges, queues, and bindings
      await this.setupInfrastructure()

      // Setup error handlers
      this.connection.on("error", (err) => {
        this.logger.error("RabbitMQ Connection Error:", err)
        this.connection = null
        this.channel = null
      })

      this.connection.on("close", () => {
        this.logger.warn("RabbitMQ Connection Closed")
        this.connection = null
        this.channel = null
      })
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ:", error)
      throw error
    }
  }

  private async disconnect(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close()
      } catch (error) {
        this.logger.error("Error closing channel:", error)
      }
      this.channel = null
    }

    if (this.connection) {
      try {
        await this.connection.close()
      } catch (error) {
        this.logger.error("Error closing connection:", error)
      }
      this.connection = null
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      this.logger.log("Reconnecting to RabbitMQ...")
      await this.connect()
    }
  }

  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not available")
    }

    // Setup Exchanges
    await this.channel.assertExchange(this.AUCTION_EXCHANGE, "topic", {
      durable: true,
      autoDelete: false,
    })

    await this.channel.assertExchange(this.NOTIFICATION_EXCHANGE, "direct", {
      durable: true,
      autoDelete: false,
    })

    await this.channel.assertExchange(this.AUDIT_EXCHANGE, "fanout", {
      durable: true,
      autoDelete: false,
    })

    // Setup Dead Letter Exchange
    await this.channel.assertExchange("dlx", "direct", {
      durable: true,
      autoDelete: false,
    })

    // Setup Queues with Dead Letter Queue configuration
    const queueOptions: Options.AssertQueue = {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "dlx",
        "x-dead-letter-routing-key": "failed",
        "x-message-ttl": 300000, // 5 minutes TTL
      },
    }

    // Bid Processing Queues
    await this.channel.assertQueue(this.BID_PROCESSING_QUEUE, {
      ...queueOptions,
      arguments: {
        ...queueOptions.arguments,
        "x-max-priority": 10, // Priority queue for urgent bids
      },
    })

    await this.channel.assertQueue(this.BID_PRIORITY_QUEUE, {
      ...queueOptions,
      arguments: {
        ...queueOptions.arguments,
        "x-max-priority": 255, // High priority for last-minute bids
      },
    })

    // Notification Queue
    await this.channel.assertQueue(this.NOTIFICATION_QUEUE, queueOptions)

    // Audit Queue
    await this.channel.assertQueue(this.AUDIT_QUEUE, {
      durable: true,
      arguments: {
        "x-message-ttl": 86400000, // 24 hours TTL for audit logs
      },
    })

    // Dead Letter Queue
    await this.channel.assertQueue(this.DEAD_LETTER_QUEUE, {
      durable: true,
      autoDelete: false,
    })

    // Retry Queue with delay
    await this.channel.assertQueue(this.RETRY_QUEUE, {
      durable: true,
      arguments: {
        "x-message-ttl": this.retryDelay,
        "x-dead-letter-exchange": this.AUCTION_EXCHANGE,
        "x-dead-letter-routing-key": "bid.retry",
      },
    })

    // Bind queues to exchanges
    await this.channel.bindQueue(this.BID_PROCESSING_QUEUE, this.AUCTION_EXCHANGE, "bid.placed")
    await this.channel.bindQueue(this.BID_PRIORITY_QUEUE, this.AUCTION_EXCHANGE, "bid.priority")
    await this.channel.bindQueue(this.NOTIFICATION_QUEUE, this.NOTIFICATION_EXCHANGE, "user.*")
    await this.channel.bindQueue(this.AUDIT_QUEUE, this.AUDIT_EXCHANGE, "")
    await this.channel.bindQueue(this.DEAD_LETTER_QUEUE, "dlx", "failed")
    await this.channel.bindQueue(this.RETRY_QUEUE, this.AUCTION_EXCHANGE, "bid.retry")

    this.logger.log("RabbitMQ infrastructure setup completed")
  }

  // Bid Processing Methods
  async publishBidEvent(routingKey: string, message: BidMessage | AuctionEventMessage, priority = 0): Promise<boolean> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const messageBuffer = Buffer.from(
        JSON.stringify({
          ...message,
          publishedAt: new Date().toISOString(),
        }),
      )

      const publishOptions: Options.Publish = {
        persistent: true,
        priority,
        messageId: `${routingKey}-${Date.now()}`,
        timestamp: Date.now(),
        headers: {
          retryCount: message.retryCount || 0,
        },
      }

      return new Promise<boolean>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error("Channel not available"))
          return
        }

        this.channel.publish(this.AUCTION_EXCHANGE, routingKey, messageBuffer, publishOptions, (err) => {
          if (err) {
            this.logger.error(`Error publishing message to ${routingKey}:`, err)
            reject(err)
          } else {
            resolve(true)
          }
        })
      })
    } catch (error) {
      this.logger.error(`Error publishing message to ${routingKey}:`, error)
      throw error
    }
  }

  async publishBidForProcessing(bidMessage: BidMessage, isHighPriority = false): Promise<boolean> {
    const queue = isHighPriority ? this.BID_PRIORITY_QUEUE : this.BID_PROCESSING_QUEUE
    const priority = isHighPriority ? 255 : 5

    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const sendOptions: Options.Publish = {
        persistent: true,
        priority,
        messageId: `bid-${bidMessage.bidId}`,
        timestamp: Date.now(),
      }

      return new Promise<boolean>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error("Channel not available"))
          return
        }

        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(bidMessage)), sendOptions, (err) => {
          if (err) {
            this.logger.error(`Error publishing bid to ${queue}:`, err)
            reject(err)
          } else {
            resolve(true)
          }
        })
      })
    } catch (error) {
      this.logger.error(`Error publishing bid to ${queue}:`, error)
      throw error
    }
  }

  // Notification Methods
  async publishNotification(notification: NotificationMessage): Promise<boolean> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const publishOptions: Options.Publish = {
        persistent: true,
        messageId: `notification-${Date.now()}`,
        timestamp: Date.now(),
      }

      return new Promise<boolean>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error("Channel not available"))
          return
        }

        this.channel.publish(
          this.NOTIFICATION_EXCHANGE,
          `user.${notification.userId}`,
          Buffer.from(JSON.stringify(notification)),
          publishOptions,
          (err) => {
            if (err) {
              this.logger.error("Error publishing notification:", err)
              reject(err)
            } else {
              resolve(true)
            }
          },
        )
      })
    } catch (error) {
      this.logger.error("Error publishing notification:", error)
      throw error
    }
  }

  async broadcastNotification(notification: Omit<NotificationMessage, "userId">): Promise<boolean> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const publishOptions: Options.Publish = {
        persistent: true,
        messageId: `broadcast-${Date.now()}`,
        timestamp: Date.now(),
      }

      return new Promise<boolean>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error("Channel not available"))
          return
        }

        this.channel.publish(
          this.NOTIFICATION_EXCHANGE,
          "user.broadcast",
          Buffer.from(JSON.stringify(notification)),
          publishOptions,
          (err) => {
            if (err) {
              this.logger.error("Error broadcasting notification:", err)
              reject(err)
            } else {
              resolve(true)
            }
          },
        )
      })
    } catch (error) {
      this.logger.error("Error broadcasting notification:", error)
      throw error
    }
  }

  // Audit Methods
  async publishAuditEvent(auditMessage: AuditMessage): Promise<boolean> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const publishOptions: Options.Publish = {
        persistent: true,
        messageId: `audit-${Date.now()}`,
        timestamp: Date.now(),
      }

      return new Promise<boolean>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error("Channel not available"))
          return
        }

        this.channel.publish(
          this.AUDIT_EXCHANGE,
          "",
          Buffer.from(JSON.stringify(auditMessage)),
          publishOptions,
          (err) => {
            if (err) {
              this.logger.error("Error publishing audit event:", err)
              reject(err)
            } else {
              resolve(true)
            }
          },
        )
      })
    } catch (error) {
      this.logger.error("Error publishing audit event:", error)
      throw error
    }
  }

  // Consumer Methods with Acknowledgments and Retry Logic
  async consumeBidProcessingQueue(callback: (message: BidMessage) => Promise<void>): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error("Channel not available")
    }

    const consumeOptions: Options.Consume = { noAck: false }

    await this.channel.consume(
      this.BID_PROCESSING_QUEUE,
      async (msg) => {
        if (msg && this.channel) {
          try {
            const bidMessage: BidMessage = JSON.parse(msg.content.toString())
            const retryCount = msg.properties.headers?.retryCount || 0

            this.logger.log(`Processing bid: ${bidMessage.bidId} (attempt ${retryCount + 1})`)

            await callback(bidMessage)

            // Acknowledge successful processing
            this.channel.ack(msg)
            this.logger.log(`Bid processed successfully: ${bidMessage.bidId}`)
          } catch (error) {
            this.logger.error("Error processing bid message:", error)
            await this.handleFailedMessage(msg, error as Error)
          }
        }
      },
      consumeOptions,
    )
  }

  async consumeBidPriorityQueue(callback: (message: BidMessage) => Promise<void>): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error("Channel not available")
    }

    const consumeOptions: Options.Consume = { noAck: false }

    await this.channel.consume(
      this.BID_PRIORITY_QUEUE,
      async (msg) => {
        if (msg && this.channel) {
          try {
            const bidMessage: BidMessage = JSON.parse(msg.content.toString())

            this.logger.log(`Processing priority bid: ${bidMessage.bidId}`)

            await callback(bidMessage)
            this.channel.ack(msg)
          } catch (error) {
            this.logger.error("Error processing priority bid:", error)
            await this.handleFailedMessage(msg, error as Error)
          }
        }
      },
      consumeOptions,
    )
  }

  async consumeNotificationQueue(callback: (message: NotificationMessage) => Promise<void>): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error("Channel not available")
    }

    const consumeOptions: Options.Consume = { noAck: false }

    await this.channel.consume(
      this.NOTIFICATION_QUEUE,
      async (msg) => {
        if (msg && this.channel) {
          try {
            const notification: NotificationMessage = JSON.parse(msg.content.toString())

            await callback(notification)
            this.channel.ack(msg)
          } catch (error) {
            this.logger.error("Error processing notification:", error)
            await this.handleFailedMessage(msg, error as Error)
          }
        }
      },
      consumeOptions,
    )
  }

  async consumeAuditQueue(callback: (message: AuditMessage) => Promise<void>): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error("Channel not available")
    }

    const consumeOptions: Options.Consume = { noAck: false }

    await this.channel.consume(
      this.AUDIT_QUEUE,
      async (msg) => {
        if (msg && this.channel) {
          try {
            const auditMessage: AuditMessage = JSON.parse(msg.content.toString())

            await callback(auditMessage)
            this.channel.ack(msg)
          } catch (error) {
            this.logger.error("Error processing audit message:", error)
            // Audit messages are critical, so we don't retry but log the failure
            this.channel.nack(msg, false, false)
          }
        }
      },
      consumeOptions,
    )
  }

  async consumeDeadLetterQueue(callback: (message: any) => Promise<void>): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error("Channel not available")
    }

    const consumeOptions: Options.Consume = { noAck: false }

    await this.channel.consume(
      this.DEAD_LETTER_QUEUE,
      async (msg) => {
        if (msg && this.channel) {
          try {
            const failedMessage = JSON.parse(msg.content.toString())

            this.logger.error(`Processing dead letter message:`, failedMessage)

            await callback(failedMessage)
            this.channel.ack(msg)
          } catch (error) {
            this.logger.error("Error processing dead letter message:", error)
            this.channel.nack(msg, false, false)
          }
        }
      },
      consumeOptions,
    )
  }

  // Retry and Error Handling
  private async handleFailedMessage(msg: ConsumeMessage, error: Error): Promise<void> {
    if (!this.channel) {
      return
    }

    const retryCount = msg.properties.headers?.retryCount || 0

    if (retryCount < this.maxRetries) {
      // Retry the message
      this.logger.warn(`Retrying message (attempt ${retryCount + 1}/${this.maxRetries})`)

      const retryOptions: Options.Publish = {
        ...msg.properties,
        headers: {
          ...msg.properties.headers,
          retryCount: retryCount + 1,
          originalQueue: msg.fields.routingKey,
          errorMessage: error.message,
          failedAt: new Date().toISOString(),
        },
      }

      await this.channel.sendToQueue(this.RETRY_QUEUE, msg.content, retryOptions)
      this.channel.ack(msg)
    } else {
      // Send to dead letter queue
      this.logger.error(`Max retries exceeded, sending to dead letter queue`)

      this.channel.nack(msg, false, false)

      // Log the failure for monitoring
      await this.publishAuditEvent({
        eventType: "message_failed",
        data: {
          originalMessage: msg.content.toString(),
          error: error.message,
          retryCount,
          queue: msg.fields.routingKey,
        },
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Health Check and Monitoring
  async getQueueStats(): Promise<Record<string, { messageCount: number; consumerCount: number }>> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      const queues = [
        this.BID_PROCESSING_QUEUE,
        this.BID_PRIORITY_QUEUE,
        this.NOTIFICATION_QUEUE,
        this.AUDIT_QUEUE,
        this.DEAD_LETTER_QUEUE,
        this.RETRY_QUEUE,
      ]

      const stats: Record<string, { messageCount: number; consumerCount: number }> = {}

      for (const queue of queues) {
        const queueInfo = await this.channel.checkQueue(queue)
        stats[queue] = {
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
        }
      }

      return stats
    } catch (error) {
      this.logger.error("Error getting queue stats:", error)
      throw error
    }
  }

  async purgeQueue(queueName: string): Promise<void> {
    try {
      await this.ensureConnection()

      if (!this.channel) {
        throw new Error("Channel not available")
      }

      await this.channel.purgeQueue(queueName)
      this.logger.log(`Queue ${queueName} purged`)
    } catch (error) {
      this.logger.error(`Error purging queue ${queueName}:`, error)
      throw error
    }
  }

  // Graceful shutdown
  async gracefulShutdown(): Promise<void> {
    this.logger.log("Initiating graceful shutdown...")

    try {
      // Wait for pending messages to be processed
      await new Promise((resolve) => setTimeout(resolve, 5000))

      await this.disconnect()
    } catch (error) {
      this.logger.error("Error during graceful shutdown:", error)
    }
  }

  // Helper method to check if connection is alive
  isConnected(): boolean {
    return !!(this.connection && this.channel)
  }

  // Helper method to get channel
  getChannel(): ConfirmChannel | null {
    return this.channel
  }

  // Helper method to get connection
  getConnection(): Connection | null {
    return this.connection
  }
}

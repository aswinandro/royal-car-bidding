import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as amqp from "amqplib"

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name)
  private connection: amqp.Connection
  private channel: amqp.Channel

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const rabbitmqUrl = this.configService.get("RABBITMQ_URL") || "amqp://localhost:5672"
      const username = this.configService.get("RABBITMQ_USERNAME") || "guest"
      const password = this.configService.get("RABBITMQ_PASSWORD") || "guest"

      this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}`)

      // Connect to RabbitMQ
      this.connection = await amqp.connect({
        hostname: rabbitmqUrl.replace("amqp://", "").split(":")[0],
        port: Number.parseInt(rabbitmqUrl.split(":")[2] || "5672"),
        username,
        password,
      })

      // Create channel
      this.channel = await this.connection.createChannel()

      // Setup exchanges
      await this.channel.assertExchange("auction.events", "topic", { durable: true })

      // Setup queues
      await this.channel.assertQueue("bid.processing", { durable: true })
      await this.channel.assertQueue("notification.queue", { durable: true })
      await this.channel.assertQueue("audit.queue", { durable: true })
      await this.channel.assertQueue("dead.letter.queue", { durable: true })

      // Bind queues to exchange
      await this.channel.bindQueue("bid.processing", "auction.events", "bid.placed")
      await this.channel.bindQueue("notification.queue", "auction.events", "auction.*")
      await this.channel.bindQueue("audit.queue", "auction.events", "#")

      this.logger.log("RabbitMQ service initialized successfully")
    } catch (error) {
      this.logger.error("Failed to initialize RabbitMQ service", error)
      throw error
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close()
      }
      if (this.connection) {
        await this.connection.close()
      }
      this.logger.log("RabbitMQ connections closed")
    } catch (error) {
      this.logger.error("Error closing RabbitMQ connections", error)
    }
  }

  async publishBidEvent(routingKey: string, message: any): Promise<boolean> {
    try {
      return this.channel.publish("auction.events", routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      })
    } catch (error) {
      this.logger.error(`Error publishing message to ${routingKey}`, error)
      throw error
    }
  }

  async consumeBidProcessingQueue(callback: (message: amqp.ConsumeMessage) => Promise<void>): Promise<void> {
    await this.channel.consume("bid.processing", async (message) => {
      if (message) {
        try {
          await callback(message)
          this.channel.ack(message)
        } catch (error) {
          this.logger.error("Error processing bid message", error)
          if (error.isTemporary) {
            this.channel.nack(message, false, true)
          } else {
            this.channel.nack(message, false, false)
            await this.channel.publish("auction.events", "bid.failed", message.content, {
              headers: { error: error.message },
            })
          }
        }
      }
    })
  }

  async consumeNotificationQueue(callback: (message: amqp.ConsumeMessage) => Promise<void>): Promise<void> {
    await this.channel.consume("notification.queue", async (message) => {
      if (message) {
        try {
          await callback(message)
          this.channel.ack(message)
        } catch (error) {
          this.logger.error("Error processing notification message", error)
          this.channel.nack(message, false, true)
        }
      }
    })
  }

  async consumeAuditQueue(callback: (message: amqp.ConsumeMessage) => Promise<void>): Promise<void> {
    await this.channel.consume("audit.queue", async (message) => {
      if (message) {
        try {
          await callback(message)
          this.channel.ack(message)
        } catch (error) {
          this.logger.error("Error processing audit message", error)
          this.channel.nack(message, false, false)
        }
      }
    })
  }
}

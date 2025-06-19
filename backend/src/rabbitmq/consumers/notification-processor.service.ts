import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { RabbitMQService, NotificationMessage } from "../rabbitmq.service"
import type { WebsocketGateway } from "../../websocket/websocket.gateway"

@Injectable()
export class NotificationProcessorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessorService.name)

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    await this.startNotificationProcessing()
  }

  private async startNotificationProcessing() {
    await this.rabbitmqService.consumeNotificationQueue(async (notification: NotificationMessage) => {
      await this.processNotification(notification)
    })

    this.logger.log("Started consuming notification queue")
  }

  private async processNotification(notification: NotificationMessage) {
    try {
      this.logger.log(`Processing notification for user: ${notification.userId}`)

      // Send via WebSocket if user is connected
      const server = this.websocketGateway.server
      if (server) {
        server.to(`user:${notification.userId}`).emit("notification", {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.timestamp,
        })
      }

      // Here you could also integrate with:
      // - Email service
      // - Push notification service
      // - SMS service
      // - Database logging

      this.logger.log(`Notification processed for user: ${notification.userId}`)
    } catch (error) {
      this.logger.error(`Error processing notification:`, error)
      throw error
    }
  }
}

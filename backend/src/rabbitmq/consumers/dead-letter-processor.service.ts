import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { RabbitMQService } from "../rabbitmq.service"

@Injectable()
export class DeadLetterProcessorService implements OnModuleInit {
  private readonly logger = new Logger(DeadLetterProcessorService.name)

  constructor(private readonly rabbitmqService: RabbitMQService) {}

  async onModuleInit() {
    await this.startDeadLetterProcessing()
  }

  private async startDeadLetterProcessing() {
    await this.rabbitmqService.consumeDeadLetterQueue(async (failedMessage: any) => {
      await this.processFailedMessage(failedMessage)
    })

    this.logger.log("Started consuming dead letter queue")
  }

  private async processFailedMessage(failedMessage: any) {
    try {
      this.logger.error(`Processing failed message:`, failedMessage)

      // Log to audit system
      await this.rabbitmqService.publishAuditEvent({
        eventType: "message_dead_letter",
        data: {
          failedMessage,
          processedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })

      // Here you could:
      // - Send alerts to administrators
      // - Store in a separate failed messages database
      // - Trigger manual review processes
      // - Send notifications to affected users

      // For critical failures, you might want to:
      // - Rollback transactions
      // - Compensate for failed operations
      // - Trigger emergency procedures

      this.logger.log("Failed message processed and logged")
    } catch (error) {
      this.logger.error("Error processing failed message:", error)
      throw error
    }
  }
}

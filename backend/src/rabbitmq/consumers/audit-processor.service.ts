import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { RabbitMQService, AuditMessage } from "../rabbitmq.service"
import type { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class AuditProcessorService implements OnModuleInit {
  private readonly logger = new Logger(AuditProcessorService.name)

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    await this.startAuditProcessing()
  }

  private async startAuditProcessing() {
    await this.rabbitmqService.consumeAuditQueue(async (auditMessage: AuditMessage) => {
      await this.processAuditEvent(auditMessage)
    })

    this.logger.log("Started consuming audit queue")
  }

  private async processAuditEvent(auditMessage: AuditMessage) {
    try {
      this.logger.log(`Processing audit event: ${auditMessage.eventType}`)

      // Store audit log in database
      await this.prismaService.auditLog.create({
        data: {
          eventType: auditMessage.eventType,
          userId: auditMessage.userId,
          auctionId: auditMessage.auctionId,
          bidId: auditMessage.bidId,
          data: auditMessage.data,
          timestamp: new Date(auditMessage.timestamp),
          ipAddress: auditMessage.ipAddress,
          userAgent: auditMessage.userAgent,
        },
      })

      // Additional compliance logging could go here
      // - External audit systems
      // - Compliance databases
      // - Regulatory reporting

      this.logger.log(`Audit event processed: ${auditMessage.eventType}`)
    } catch (error) {
      this.logger.error(`Error processing audit event:`, error)
      throw error
    }
  }
}

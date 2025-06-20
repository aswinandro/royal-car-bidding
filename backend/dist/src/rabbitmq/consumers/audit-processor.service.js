"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuditProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditProcessorService = void 0;
const common_1 = require("@nestjs/common");
const rabbitmq_service_1 = require("../rabbitmq.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuditProcessorService = AuditProcessorService_1 = class AuditProcessorService {
    constructor(rabbitmqService, prismaService) {
        this.rabbitmqService = rabbitmqService;
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(AuditProcessorService_1.name);
    }
    async onModuleInit() {
        await this.startAuditProcessing();
    }
    async startAuditProcessing() {
        await this.rabbitmqService.consumeAuditQueue(async (auditMessage) => {
            await this.processAuditEvent(auditMessage);
        });
        this.logger.log("Started consuming audit queue");
    }
    async processAuditEvent(auditMessage) {
        try {
            this.logger.log(`Processing audit event: ${auditMessage.eventType}`);
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
            });
            this.logger.log(`Audit event processed: ${auditMessage.eventType}`);
        }
        catch (error) {
            this.logger.error(`Error processing audit event:`, error);
            throw error;
        }
    }
};
exports.AuditProcessorService = AuditProcessorService;
exports.AuditProcessorService = AuditProcessorService = AuditProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_service_1.RabbitMQService,
        prisma_service_1.PrismaService])
], AuditProcessorService);
//# sourceMappingURL=audit-processor.service.js.map
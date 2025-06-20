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
var DeadLetterProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterProcessorService = void 0;
const common_1 = require("@nestjs/common");
const rabbitmq_service_1 = require("../rabbitmq.service");
let DeadLetterProcessorService = DeadLetterProcessorService_1 = class DeadLetterProcessorService {
    constructor(rabbitmqService) {
        this.rabbitmqService = rabbitmqService;
        this.logger = new common_1.Logger(DeadLetterProcessorService_1.name);
    }
    async onModuleInit() {
        await this.startDeadLetterProcessing();
    }
    async startDeadLetterProcessing() {
        await this.rabbitmqService.consumeDeadLetterQueue(async (failedMessage) => {
            await this.processFailedMessage(failedMessage);
        });
        this.logger.log("Started consuming dead letter queue");
    }
    async processFailedMessage(failedMessage) {
        try {
            this.logger.error(`Processing failed message:`, failedMessage);
            await this.rabbitmqService.publishAuditEvent({
                eventType: "message_dead_letter",
                data: {
                    failedMessage,
                    processedAt: new Date().toISOString(),
                },
                timestamp: new Date().toISOString(),
            });
            this.logger.log("Failed message processed and logged");
        }
        catch (error) {
            this.logger.error("Error processing failed message:", error);
            throw error;
        }
    }
};
exports.DeadLetterProcessorService = DeadLetterProcessorService;
exports.DeadLetterProcessorService = DeadLetterProcessorService = DeadLetterProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_service_1.RabbitMQService])
], DeadLetterProcessorService);
//# sourceMappingURL=dead-letter-processor.service.js.map
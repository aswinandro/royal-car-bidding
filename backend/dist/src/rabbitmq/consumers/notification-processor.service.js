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
var NotificationProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessorService = void 0;
const common_1 = require("@nestjs/common");
const rabbitmq_service_1 = require("../rabbitmq.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
let NotificationProcessorService = NotificationProcessorService_1 = class NotificationProcessorService {
    constructor(rabbitmqService, websocketGateway) {
        this.rabbitmqService = rabbitmqService;
        this.websocketGateway = websocketGateway;
        this.logger = new common_1.Logger(NotificationProcessorService_1.name);
    }
    async onModuleInit() {
        await this.startNotificationProcessing();
    }
    async startNotificationProcessing() {
        await this.rabbitmqService.consumeNotificationQueue(async (notification) => {
            await this.processNotification(notification);
        });
        this.logger.log("Started consuming notification queue");
    }
    async processNotification(notification) {
        try {
            this.logger.log(`Processing notification for user: ${notification.userId}`);
            const server = this.websocketGateway.server;
            if (server) {
                server.to(`user:${notification.userId}`).emit("notification", {
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    timestamp: notification.timestamp,
                });
            }
            this.logger.log(`Notification processed for user: ${notification.userId}`);
        }
        catch (error) {
            this.logger.error(`Error processing notification:`, error);
            throw error;
        }
    }
};
exports.NotificationProcessorService = NotificationProcessorService;
exports.NotificationProcessorService = NotificationProcessorService = NotificationProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_service_1.RabbitMQService,
        websocket_gateway_1.WebsocketGateway])
], NotificationProcessorService);
//# sourceMappingURL=notification-processor.service.js.map
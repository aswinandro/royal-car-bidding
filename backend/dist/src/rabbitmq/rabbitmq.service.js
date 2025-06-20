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
var RabbitMQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
const common_1 = require("@nestjs/common");
const amqplib_1 = require("amqplib");
let RabbitMQService = RabbitMQService_1 = class RabbitMQService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RabbitMQService_1.name);
        this.connection = null;
        this.channel = null;
        this.maxRetries = 3;
        this.retryDelay = 5000;
        this.AUCTION_EXCHANGE = "auction.events";
        this.NOTIFICATION_EXCHANGE = "notifications";
        this.AUDIT_EXCHANGE = "audit.events";
        this.BID_PROCESSING_QUEUE = "bid.processing";
        this.BID_PRIORITY_QUEUE = "bid.priority";
        this.NOTIFICATION_QUEUE = "notification.queue";
        this.AUDIT_QUEUE = "audit.queue";
        this.DEAD_LETTER_QUEUE = "dead.letter.queue";
        this.RETRY_QUEUE = "retry.queue";
    }
    async onModuleInit() {
        try {
            await this.connect();
            this.logger.log("RabbitMQ service initialized successfully");
        }
        catch (error) {
            this.logger.error("Failed to initialize RabbitMQ service", error);
            throw error;
        }
    }
    async onModuleDestroy() {
        try {
            await this.disconnect();
            this.logger.log("RabbitMQ connections closed");
        }
        catch (error) {
            this.logger.error("Error closing RabbitMQ connections", error);
        }
    }
    async connect() {
        const rabbitmqUrl = this.configService.get("RABBITMQ_URL") || "amqp://localhost:5672";
        const username = this.configService.get("RABBITMQ_USERNAME") || "guest";
        const password = this.configService.get("RABBITMQ_PASSWORD") || "guest";
        this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}`);
        const connectionUrl = rabbitmqUrl.includes("@")
            ? rabbitmqUrl
            : rabbitmqUrl.replace("amqp://", `amqp://${username}:${password}@`);
        try {
            this.connection = await (0, amqplib_1.connect)(connectionUrl, {
                heartbeat: 60,
            });
            this.channel = await this.connection.createConfirmChannel();
            await this.channel.prefetch(10);
            await this.setupInfrastructure();
            this.connection.on("error", (err) => {
                this.logger.error("RabbitMQ Connection Error:", err);
                this.connection = null;
                this.channel = null;
            });
            this.connection.on("close", () => {
                this.logger.warn("RabbitMQ Connection Closed");
                this.connection = null;
                this.channel = null;
            });
        }
        catch (error) {
            this.logger.error("Failed to connect to RabbitMQ:", error);
            throw error;
        }
    }
    async disconnect() {
        if (this.channel) {
            try {
                await this.channel.close();
            }
            catch (error) {
                this.logger.error("Error closing channel:", error);
            }
            this.channel = null;
        }
        if (this.connection) {
            try {
                await this.connection.close();
            }
            catch (error) {
                this.logger.error("Error closing connection:", error);
            }
            this.connection = null;
        }
    }
    async ensureConnection() {
        if (!this.isConnected()) {
            this.logger.log("Reconnecting to RabbitMQ...");
            await this.connect();
        }
    }
    async setupInfrastructure() {
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        await this.channel.assertExchange(this.AUCTION_EXCHANGE, "topic", {
            durable: true,
            autoDelete: false,
        });
        await this.channel.assertExchange(this.NOTIFICATION_EXCHANGE, "direct", {
            durable: true,
            autoDelete: false,
        });
        await this.channel.assertExchange(this.AUDIT_EXCHANGE, "fanout", {
            durable: true,
            autoDelete: false,
        });
        await this.channel.assertExchange("dlx", "direct", {
            durable: true,
            autoDelete: false,
        });
        const queueOptions = {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": "dlx",
                "x-dead-letter-routing-key": "failed",
                "x-message-ttl": 300000,
            },
        };
        await this.channel.assertQueue(this.BID_PROCESSING_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                "x-max-priority": 10,
            },
        });
        await this.channel.assertQueue(this.BID_PRIORITY_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                "x-max-priority": 255,
            },
        });
        await this.channel.assertQueue(this.NOTIFICATION_QUEUE, queueOptions);
        await this.channel.assertQueue(this.AUDIT_QUEUE, {
            durable: true,
            arguments: {
                "x-message-ttl": 86400000,
            },
        });
        await this.channel.assertQueue(this.DEAD_LETTER_QUEUE, {
            durable: true,
            autoDelete: false,
        });
        await this.channel.assertQueue(this.RETRY_QUEUE, {
            durable: true,
            arguments: {
                "x-message-ttl": this.retryDelay,
                "x-dead-letter-exchange": this.AUCTION_EXCHANGE,
                "x-dead-letter-routing-key": "bid.retry",
            },
        });
        await this.channel.bindQueue(this.BID_PROCESSING_QUEUE, this.AUCTION_EXCHANGE, "bid.placed");
        await this.channel.bindQueue(this.BID_PRIORITY_QUEUE, this.AUCTION_EXCHANGE, "bid.priority");
        await this.channel.bindQueue(this.NOTIFICATION_QUEUE, this.NOTIFICATION_EXCHANGE, "user.*");
        await this.channel.bindQueue(this.AUDIT_QUEUE, this.AUDIT_EXCHANGE, "");
        await this.channel.bindQueue(this.DEAD_LETTER_QUEUE, "dlx", "failed");
        await this.channel.bindQueue(this.RETRY_QUEUE, this.AUCTION_EXCHANGE, "bid.retry");
        this.logger.log("RabbitMQ infrastructure setup completed");
    }
    async publishBidEvent(routingKey, message, priority = 0) {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const messageBuffer = Buffer.from(JSON.stringify({
                ...message,
                publishedAt: new Date().toISOString(),
            }));
            const publishOptions = {
                persistent: true,
                priority,
                messageId: `${routingKey}-${Date.now()}`,
                timestamp: Date.now(),
                headers: {
                    retryCount: message.retryCount || 0,
                },
            };
            return new Promise((resolve, reject) => {
                if (!this.channel) {
                    reject(new Error("Channel not available"));
                    return;
                }
                this.channel.publish(this.AUCTION_EXCHANGE, routingKey, messageBuffer, publishOptions, (err) => {
                    if (err) {
                        this.logger.error(`Error publishing message to ${routingKey}:`, err);
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            this.logger.error(`Error publishing message to ${routingKey}:`, error);
            throw error;
        }
    }
    async publishBidForProcessing(bidMessage, isHighPriority = false) {
        const queue = isHighPriority ? this.BID_PRIORITY_QUEUE : this.BID_PROCESSING_QUEUE;
        const priority = isHighPriority ? 255 : 5;
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const sendOptions = {
                persistent: true,
                priority,
                messageId: `bid-${bidMessage.bidId}`,
                timestamp: Date.now(),
            };
            return new Promise((resolve, reject) => {
                if (!this.channel) {
                    reject(new Error("Channel not available"));
                    return;
                }
                this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(bidMessage)), sendOptions, (err) => {
                    if (err) {
                        this.logger.error(`Error publishing bid to ${queue}:`, err);
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            this.logger.error(`Error publishing bid to ${queue}:`, error);
            throw error;
        }
    }
    async publishNotification(notification) {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const publishOptions = {
                persistent: true,
                messageId: `notification-${Date.now()}`,
                timestamp: Date.now(),
            };
            return new Promise((resolve, reject) => {
                if (!this.channel) {
                    reject(new Error("Channel not available"));
                    return;
                }
                this.channel.publish(this.NOTIFICATION_EXCHANGE, `user.${notification.userId}`, Buffer.from(JSON.stringify(notification)), publishOptions, (err) => {
                    if (err) {
                        this.logger.error("Error publishing notification:", err);
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            this.logger.error("Error publishing notification:", error);
            throw error;
        }
    }
    async broadcastNotification(notification) {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const publishOptions = {
                persistent: true,
                messageId: `broadcast-${Date.now()}`,
                timestamp: Date.now(),
            };
            return new Promise((resolve, reject) => {
                if (!this.channel) {
                    reject(new Error("Channel not available"));
                    return;
                }
                this.channel.publish(this.NOTIFICATION_EXCHANGE, "user.broadcast", Buffer.from(JSON.stringify(notification)), publishOptions, (err) => {
                    if (err) {
                        this.logger.error("Error broadcasting notification:", err);
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            this.logger.error("Error broadcasting notification:", error);
            throw error;
        }
    }
    async publishAuditEvent(auditMessage) {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const publishOptions = {
                persistent: true,
                messageId: `audit-${Date.now()}`,
                timestamp: Date.now(),
            };
            return new Promise((resolve, reject) => {
                if (!this.channel) {
                    reject(new Error("Channel not available"));
                    return;
                }
                this.channel.publish(this.AUDIT_EXCHANGE, "", Buffer.from(JSON.stringify(auditMessage)), publishOptions, (err) => {
                    if (err) {
                        this.logger.error("Error publishing audit event:", err);
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            this.logger.error("Error publishing audit event:", error);
            throw error;
        }
    }
    async consumeBidProcessingQueue(callback) {
        await this.ensureConnection();
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        const consumeOptions = { noAck: false };
        await this.channel.consume(this.BID_PROCESSING_QUEUE, async (msg) => {
            if (msg && this.channel) {
                try {
                    const bidMessage = JSON.parse(msg.content.toString());
                    const retryCount = msg.properties.headers?.retryCount || 0;
                    this.logger.log(`Processing bid: ${bidMessage.bidId} (attempt ${retryCount + 1})`);
                    await callback(bidMessage);
                    this.channel.ack(msg);
                    this.logger.log(`Bid processed successfully: ${bidMessage.bidId}`);
                }
                catch (error) {
                    this.logger.error("Error processing bid message:", error);
                    await this.handleFailedMessage(msg, error);
                }
            }
        }, consumeOptions);
    }
    async consumeBidPriorityQueue(callback) {
        await this.ensureConnection();
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        const consumeOptions = { noAck: false };
        await this.channel.consume(this.BID_PRIORITY_QUEUE, async (msg) => {
            if (msg && this.channel) {
                try {
                    const bidMessage = JSON.parse(msg.content.toString());
                    this.logger.log(`Processing priority bid: ${bidMessage.bidId}`);
                    await callback(bidMessage);
                    this.channel.ack(msg);
                }
                catch (error) {
                    this.logger.error("Error processing priority bid:", error);
                    await this.handleFailedMessage(msg, error);
                }
            }
        }, consumeOptions);
    }
    async consumeNotificationQueue(callback) {
        await this.ensureConnection();
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        const consumeOptions = { noAck: false };
        await this.channel.consume(this.NOTIFICATION_QUEUE, async (msg) => {
            if (msg && this.channel) {
                try {
                    const notification = JSON.parse(msg.content.toString());
                    await callback(notification);
                    this.channel.ack(msg);
                }
                catch (error) {
                    this.logger.error("Error processing notification:", error);
                    await this.handleFailedMessage(msg, error);
                }
            }
        }, consumeOptions);
    }
    async consumeAuditQueue(callback) {
        await this.ensureConnection();
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        const consumeOptions = { noAck: false };
        await this.channel.consume(this.AUDIT_QUEUE, async (msg) => {
            if (msg && this.channel) {
                try {
                    const auditMessage = JSON.parse(msg.content.toString());
                    await callback(auditMessage);
                    this.channel.ack(msg);
                }
                catch (error) {
                    this.logger.error("Error processing audit message:", error);
                    this.channel.nack(msg, false, false);
                }
            }
        }, consumeOptions);
    }
    async consumeDeadLetterQueue(callback) {
        await this.ensureConnection();
        if (!this.channel) {
            throw new Error("Channel not available");
        }
        const consumeOptions = { noAck: false };
        await this.channel.consume(this.DEAD_LETTER_QUEUE, async (msg) => {
            if (msg && this.channel) {
                try {
                    const failedMessage = JSON.parse(msg.content.toString());
                    this.logger.error(`Processing dead letter message:`, failedMessage);
                    await callback(failedMessage);
                    this.channel.ack(msg);
                }
                catch (error) {
                    this.logger.error("Error processing dead letter message:", error);
                    this.channel.nack(msg, false, false);
                }
            }
        }, consumeOptions);
    }
    async handleFailedMessage(msg, error) {
        if (!this.channel) {
            return;
        }
        const retryCount = msg.properties.headers?.retryCount || 0;
        if (retryCount < this.maxRetries) {
            this.logger.warn(`Retrying message (attempt ${retryCount + 1}/${this.maxRetries})`);
            const retryOptions = {
                ...msg.properties,
                headers: {
                    ...msg.properties.headers,
                    retryCount: retryCount + 1,
                    originalQueue: msg.fields.routingKey,
                    errorMessage: error.message,
                    failedAt: new Date().toISOString(),
                },
            };
            await this.channel.sendToQueue(this.RETRY_QUEUE, msg.content, retryOptions);
            this.channel.ack(msg);
        }
        else {
            this.logger.error(`Max retries exceeded, sending to dead letter queue`);
            this.channel.nack(msg, false, false);
            await this.publishAuditEvent({
                eventType: "message_failed",
                data: {
                    originalMessage: msg.content.toString(),
                    error: error.message,
                    retryCount,
                    queue: msg.fields.routingKey,
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getQueueStats() {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            const queues = [
                this.BID_PROCESSING_QUEUE,
                this.BID_PRIORITY_QUEUE,
                this.NOTIFICATION_QUEUE,
                this.AUDIT_QUEUE,
                this.DEAD_LETTER_QUEUE,
                this.RETRY_QUEUE,
            ];
            const stats = {};
            for (const queue of queues) {
                const queueInfo = await this.channel.checkQueue(queue);
                stats[queue] = {
                    messageCount: queueInfo.messageCount,
                    consumerCount: queueInfo.consumerCount,
                };
            }
            return stats;
        }
        catch (error) {
            this.logger.error("Error getting queue stats:", error);
            throw error;
        }
    }
    async purgeQueue(queueName) {
        try {
            await this.ensureConnection();
            if (!this.channel) {
                throw new Error("Channel not available");
            }
            await this.channel.purgeQueue(queueName);
            this.logger.log(`Queue ${queueName} purged`);
        }
        catch (error) {
            this.logger.error(`Error purging queue ${queueName}:`, error);
            throw error;
        }
    }
    async gracefulShutdown() {
        this.logger.log("Initiating graceful shutdown...");
        try {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await this.disconnect();
        }
        catch (error) {
            this.logger.error("Error during graceful shutdown:", error);
        }
    }
    isConnected() {
        return !!(this.connection && this.channel);
    }
    getChannel() {
        return this.channel;
    }
    getConnection() {
        return this.connection;
    }
};
exports.RabbitMQService = RabbitMQService;
exports.RabbitMQService = RabbitMQService = RabbitMQService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Function])
], RabbitMQService);
//# sourceMappingURL=rabbitmq.service.js.map
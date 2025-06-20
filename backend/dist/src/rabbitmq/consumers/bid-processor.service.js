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
var BidProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidProcessorService = void 0;
const common_1 = require("@nestjs/common");
const rabbitmq_service_1 = require("../rabbitmq.service");
const bid_service_1 = require("../../bid/bid.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const redis_service_1 = require("../../redis/redis.service");
let BidProcessorService = BidProcessorService_1 = class BidProcessorService {
    constructor(rabbitmqService, bidService, websocketGateway, redisService) {
        this.rabbitmqService = rabbitmqService;
        this.bidService = bidService;
        this.websocketGateway = websocketGateway;
        this.redisService = redisService;
        this.logger = new common_1.Logger(BidProcessorService_1.name);
    }
    async onModuleInit() {
        await this.startBidProcessing();
        await this.startPriorityBidProcessing();
    }
    async startBidProcessing() {
        await this.rabbitmqService.consumeBidProcessingQueue(async (bidMessage) => {
            await this.processBid(bidMessage);
        });
        this.logger.log("Started consuming bid processing queue");
    }
    async startPriorityBidProcessing() {
        await this.rabbitmqService.consumeBidPriorityQueue(async (bidMessage) => {
            await this.processBid(bidMessage, true);
        });
        this.logger.log("Started consuming priority bid processing queue");
    }
    async processBid(bidMessage, isPriority = false) {
        const { bidId, userId, auctionId, amount } = bidMessage;
        try {
            this.logger.log(`Processing ${isPriority ? "priority " : ""}bid: ${bidId}`);
            const lockKey = `bid:lock:${auctionId}`;
            const lockAcquired = await this.acquireLock(lockKey, 5000);
            if (!lockAcquired) {
                throw new Error("Could not acquire bid processing lock");
            }
            try {
                const currentHighest = await this.bidService.getHighestBid(auctionId);
                const minBidAmount = currentHighest ? currentHighest.amount + 1 : 0;
                if (amount < minBidAmount) {
                    throw new Error(`Bid amount ${amount} is too low. Minimum: ${minBidAmount}`);
                }
                const bid = await this.bidService.create({ auctionId, amount }, userId);
                await this.redisService.cacheHighestBid(auctionId, amount, userId);
                this.websocketGateway.broadcastBidUpdate(auctionId, {
                    bidId: bid.id,
                    userId,
                    auctionId,
                    amount,
                    timestamp: bid.createdAt,
                    isPriority,
                });
                await this.sendBidNotifications(bid, auctionId);
                await this.rabbitmqService.publishAuditEvent({
                    eventType: "bid_processed",
                    userId,
                    auctionId,
                    bidId: bid.id,
                    data: { amount, isPriority },
                    timestamp: new Date().toISOString(),
                });
                this.logger.log(`Bid processed successfully: ${bidId}`);
            }
            finally {
                await this.releaseLock(lockKey);
            }
        }
        catch (error) {
            this.logger.error(`Error processing bid ${bidId}:`, error);
            await this.rabbitmqService.publishNotification({
                userId,
                type: "bid_placed",
                title: "Bid Failed",
                message: `Your bid of $${amount} could not be processed: ${error.message}`,
                data: { auctionId, amount, error: error.message },
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }
    async sendBidNotifications(bid, auctionId) {
        await this.rabbitmqService.publishNotification({
            userId: bid.userId,
            type: "bid_placed",
            title: "Bid Placed Successfully",
            message: `Your bid of $${bid.amount} has been placed successfully`,
            data: { auctionId, bidId: bid.id, amount: bid.amount },
            timestamp: new Date().toISOString(),
        });
        await this.rabbitmqService.broadcastNotification({
            type: "bid_placed",
            title: "New Bid Placed",
            message: `A new bid of $${bid.amount} has been placed`,
            data: { auctionId, amount: bid.amount },
            timestamp: new Date().toISOString(),
        });
    }
    async acquireLock(key, ttl) {
        try {
            const result = await this.redisService.getClient().set(key, "1", {
                PX: ttl,
                NX: true,
            });
            return result === "OK";
        }
        catch (error) {
            this.logger.error(`Error acquiring lock ${key}:`, error);
            return false;
        }
    }
    async releaseLock(key) {
        try {
            await this.redisService.del(key);
        }
        catch (error) {
            this.logger.error(`Error releasing lock ${key}:`, error);
        }
    }
};
exports.BidProcessorService = BidProcessorService;
exports.BidProcessorService = BidProcessorService = BidProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_service_1.RabbitMQService,
        bid_service_1.BidService,
        websocket_gateway_1.WebsocketGateway,
        redis_service_1.RedisService])
], BidProcessorService);
//# sourceMappingURL=bid-processor.service.js.map
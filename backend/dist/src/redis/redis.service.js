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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
let RedisService = RedisService_1 = class RedisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    async onModuleInit() {
        const redisHost = this.config.host;
        const redisPort = this.config.port;
        const redisPassword = this.config.password;
        const redisUrl = `redis://${redisHost}:${redisPort}`;
        this.logger.log(`Connecting to Redis at ${redisUrl}`);
        this.client = (0, redis_1.createClient)({
            url: redisUrl,
            password: redisPassword || undefined,
        });
        this.subscriber = this.client.duplicate();
        this.publisher = this.client.duplicate();
        await this.client.connect();
        await this.subscriber.connect();
        await this.publisher.connect();
        this.client.on("error", (err) => this.logger.error("Redis Client Error", err));
        this.subscriber.on("error", (err) => this.logger.error("Redis Subscriber Error", err));
        this.publisher.on("error", (err) => this.logger.error("Redis Publisher Error", err));
        this.logger.log("Redis service initialized successfully");
    }
    async onModuleDestroy() {
        await this.client.quit();
        await this.subscriber.quit();
        await this.publisher.quit();
        this.logger.log("Redis connections closed");
    }
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    getPublisher() {
        return this.publisher;
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        return this.client.get(key);
    }
    async del(key) {
        await this.client.del(key);
    }
    async publish(channel, message) {
        await this.publisher.publish(channel, message);
    }
    async subscribe(channel, callback) {
        await this.subscriber.subscribe(channel, callback);
    }
    async unsubscribe(channel) {
        await this.subscriber.unsubscribe(channel);
    }
    async cacheHighestBid(auctionId, bidAmount, userId) {
        const bidData = JSON.stringify({ amount: bidAmount, userId });
        await this.set(`auction:${auctionId}:highestBid`, bidData);
    }
    async getHighestBid(auctionId) {
        const data = await this.get(`auction:${auctionId}:highestBid`);
        return data ? JSON.parse(data) : null;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], RedisService);
//# sourceMappingURL=redis.service.js.map
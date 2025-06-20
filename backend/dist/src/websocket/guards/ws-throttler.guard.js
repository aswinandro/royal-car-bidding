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
var WsThrottlerGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const redis_service_1 = require("../../redis/redis.service");
let WsThrottlerGuard = WsThrottlerGuard_1 = class WsThrottlerGuard {
    constructor(redisService) {
        this.redisService = redisService;
        this.logger = new common_1.Logger(WsThrottlerGuard_1.name);
        this.ttl = 1;
        this.limit = 5;
    }
    async canActivate(context) {
        const client = context.switchToWs().getClient();
        const userId = client.data.user?.sub || client.handshake.address;
        const event = context.getHandler().name;
        const key = `throttle:ws:${userId}:${event}`;
        try {
            const current = await this.redisService.get(key);
            const count = current ? Number.parseInt(current, 10) : 0;
            if (count >= this.limit) {
                this.logger.warn(`Rate limit exceeded for ${userId} on ${event}`);
                throw new websockets_1.WsException("Too many requests");
            }
            if (count === 0) {
                await this.redisService.set(key, "1", this.ttl);
            }
            else {
                await this.redisService.getClient().incr(key);
            }
            return true;
        }
        catch (error) {
            if (error instanceof websockets_1.WsException) {
                throw error;
            }
            this.logger.error("WS Throttler Guard Error", error);
            return false;
        }
    }
};
exports.WsThrottlerGuard = WsThrottlerGuard;
exports.WsThrottlerGuard = WsThrottlerGuard = WsThrottlerGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], WsThrottlerGuard);
//# sourceMappingURL=ws-throttler.guard.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const user_module_1 = require("./user/user.module");
const auction_module_1 = require("./auction/auction.module");
const bid_module_1 = require("./bid/bid.module");
const websocket_module_1 = require("./websocket/websocket.module");
const redis_module_1 = require("./redis/redis.module");
const rabbitmq_module_1 = require("./rabbitmq/rabbitmq.module");
const auth_module_1 = require("./auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [".env.local", ".env"],
                cache: true,
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    ttl: Number(configService.get("THROTTLE_TTL", "60")),
                    limit: Number(configService.get("THROTTLE_LIMIT", "10")),
                }),
            }),
            prisma_module_1.PrismaModule,
            user_module_1.UserModule,
            auction_module_1.AuctionModule,
            bid_module_1.BidModule,
            websocket_module_1.WebsocketModule,
            redis_module_1.RedisModule,
            rabbitmq_module_1.RabbitMQModule,
            auth_module_1.AuthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
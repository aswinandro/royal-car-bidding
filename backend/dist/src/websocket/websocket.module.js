"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketModule = void 0;
const common_1 = require("@nestjs/common");
const websocket_gateway_1 = require("./websocket.gateway");
const websocket_service_1 = require("./websocket.service");
const auction_room_service_1 = require("./services/auction-room.service");
const redis_module_1 = require("../redis/redis.module");
const auction_module_1 = require("../auction/auction.module");
const bid_module_1 = require("../bid/bid.module");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let WebsocketModule = class WebsocketModule {
};
exports.WebsocketModule = WebsocketModule;
exports.WebsocketModule = WebsocketModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            redis_module_1.RedisModule,
            (0, common_1.forwardRef)(() => auction_module_1.AuctionModule),
            (0, common_1.forwardRef)(() => bid_module_1.BidModule),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get("JWT_SECRET") || "fallback-secret-key",
                    signOptions: {
                        expiresIn: configService.get("JWT_EXPIRES_IN") || "1d",
                    },
                }),
            }),
        ],
        providers: [websocket_gateway_1.WebsocketGateway, websocket_service_1.WebSocketService, auction_room_service_1.AuctionRoomService],
        exports: [websocket_gateway_1.WebsocketGateway, websocket_service_1.WebSocketService, auction_room_service_1.AuctionRoomService],
    })
], WebsocketModule);
//# sourceMappingURL=websocket.module.js.map
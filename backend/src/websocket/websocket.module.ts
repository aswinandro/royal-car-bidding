import { Module, forwardRef } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";
import { WebSocketService } from "./websocket.service";
import { AuctionRoomService } from "./services/auction-room.service";
import { RedisModule } from "../redis/redis.module";
import { AuctionModule } from "../auction/auction.module";
import { BidModule } from "../bid/bid.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
        ConfigModule,
    RedisModule,
    forwardRef(() => AuctionModule),  // Use forwardRef here
    forwardRef(() => BidModule),      // And here
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET") || "fallback-secret-key",
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN") || "1d",
        },
      }),
    }),
  ],
  providers: [WebsocketGateway, WebSocketService, AuctionRoomService],
  exports: [WebsocketGateway, WebSocketService, AuctionRoomService],
})
export class WebsocketModule {}

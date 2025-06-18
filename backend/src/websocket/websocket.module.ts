import { Module } from "@nestjs/common"
import { WebsocketGateway } from "./websocket.gateway"
import { RedisModule } from "../redis/redis.module"
import { AuctionModule } from "../auction/auction.module"
import { BidModule } from "../bid/bid.module"
import { JwtModule } from "@nestjs/jwt"
import { ConfigModule, ConfigService } from "@nestjs/config"

@Module({
  imports: [
    RedisModule,
    AuctionModule,
    BidModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET", "secret"),
      }),
    }),
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}

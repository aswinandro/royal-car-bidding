import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { ThrottlerModule } from "@nestjs/throttler"
import { PrismaModule } from "./prisma/prisma.module"
import { UserModule } from "./user/user.module"
import { AuctionModule } from "./auction/auction.module"
import { BidModule } from "./bid/bid.module"
import { WebsocketModule } from "./websocket/websocket.module"
import { RedisModule } from "./redis/redis.module"
import { RabbitMQModule } from "./rabbitmq/rabbitmq.module"
import { AuthModule } from "./auth/auth.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: Number(configService.get("THROTTLE_TTL", "60")),
        limit: Number(configService.get("THROTTLE_LIMIT", "10")),
      }),
    }),
    PrismaModule,
    UserModule,
    AuctionModule,
    BidModule,
    WebsocketModule,
    RedisModule,
    RabbitMQModule,
    AuthModule,
  ],
})
export class AppModule {}

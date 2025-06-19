import { Module, Global } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { RedisService } from "./redis.service"

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RedisService,
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
          password: configService.get("REDIS_PASSWORD", ""),
        }
        return new RedisService(redisConfig)
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}

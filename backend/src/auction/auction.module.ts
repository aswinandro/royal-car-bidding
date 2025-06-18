import { Module } from "@nestjs/common"
import { AuctionService } from "./auction.service"
import { AuctionController } from "./auction.controller"
import { PrismaModule } from "../prisma/prisma.module"
import { RedisModule } from "../redis/redis.module"
import { RabbitMQModule } from "../rabbitmq/rabbitmq.module"

@Module({
  imports: [PrismaModule, RedisModule, RabbitMQModule],
  controllers: [AuctionController],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}

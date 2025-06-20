import { forwardRef, Module } from '@nestjs/common';
import { BidService } from './bid.service';
import { BidController } from './bid.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => RabbitMQModule), 
  ],
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService],
})
export class BidModule {}

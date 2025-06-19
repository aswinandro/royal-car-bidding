import { Module, Global } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { RabbitMQService } from "./rabbitmq.service"
import { BidProcessorService } from "./consumers/bid-processor.service"
import { NotificationProcessorService } from "./consumers/notification-processor.service"
import { AuditProcessorService } from "./consumers/audit-processor.service"
import { DeadLetterProcessorService } from "./consumers/dead-letter-processor.service"
import { BidModule } from "../bid/bid.module"
import { WebsocketModule } from "../websocket/websocket.module"

@Global()
@Module({
  imports: [ConfigModule, BidModule, WebsocketModule],
  providers: [
    {
      provide: RabbitMQService,
      useFactory: (configService: ConfigService) => {
        return new RabbitMQService(configService)
      },
      inject: [ConfigService],
    },
    BidProcessorService,
    NotificationProcessorService,
    AuditProcessorService,
    DeadLetterProcessorService,
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}

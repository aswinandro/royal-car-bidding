import { Module, Global } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { RabbitMQService } from "./rabbitmq.service"

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RabbitMQService,
      useFactory: (configService: ConfigService) => {
        return new RabbitMQService({
          url: configService.get("RABBITMQ_URL", "amqp://localhost:5672"),
          username: configService.get("RABBITMQ_USERNAME", "guest"),
          password: configService.get("RABBITMQ_PASSWORD", "guest"),
        })
      },
      inject: [ConfigService],
    },
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}

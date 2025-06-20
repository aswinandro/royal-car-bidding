import { type OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
export declare class DeadLetterProcessorService implements OnModuleInit {
    private readonly rabbitmqService;
    private readonly logger;
    constructor(rabbitmqService: RabbitMQService);
    onModuleInit(): Promise<void>;
    private startDeadLetterProcessing;
    private processFailedMessage;
}

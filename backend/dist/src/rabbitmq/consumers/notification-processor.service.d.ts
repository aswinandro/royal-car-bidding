import { type OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { WebsocketGateway } from "../../websocket/websocket.gateway";
export declare class NotificationProcessorService implements OnModuleInit {
    private readonly rabbitmqService;
    private readonly websocketGateway;
    private readonly logger;
    constructor(rabbitmqService: RabbitMQService, websocketGateway: WebsocketGateway);
    onModuleInit(): Promise<void>;
    private startNotificationProcessing;
    private processNotification;
}

import { type OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { BidService } from "../../bid/bid.service";
import { WebsocketGateway } from "../../websocket/websocket.gateway";
import { RedisService } from "../../redis/redis.service";
export declare class BidProcessorService implements OnModuleInit {
    private readonly rabbitmqService;
    private readonly bidService;
    private readonly websocketGateway;
    private readonly redisService;
    private readonly logger;
    constructor(rabbitmqService: RabbitMQService, bidService: BidService, websocketGateway: WebsocketGateway, redisService: RedisService);
    onModuleInit(): Promise<void>;
    private startBidProcessing;
    private startPriorityBidProcessing;
    private processBid;
    private sendBidNotifications;
    private acquireLock;
    private releaseLock;
}

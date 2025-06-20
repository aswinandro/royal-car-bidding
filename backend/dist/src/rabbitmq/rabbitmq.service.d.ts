import { type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { type Connection, type ConfirmChannel } from "amqplib";
export interface BidMessage {
    bidId: string;
    userId: string;
    auctionId: string;
    amount: number;
    timestamp: string;
    retryCount?: number;
}
export interface AuctionEventMessage {
    auctionId: string;
    eventType: "started" | "ended" | "updated" | "created" | "deleted";
    data: any;
    timestamp: string;
    userId?: string;
    retryCount?: number;
}
export interface NotificationMessage {
    userId: string;
    type: "bid_placed" | "auction_won" | "auction_lost" | "auction_started" | "auction_ended";
    title: string;
    message: string;
    data: any;
    timestamp: string;
}
export interface AuditMessage {
    eventType: string;
    userId?: string;
    auctionId?: string;
    bidId?: string;
    data: any;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private channel;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly AUCTION_EXCHANGE;
    private readonly NOTIFICATION_EXCHANGE;
    private readonly AUDIT_EXCHANGE;
    private readonly BID_PROCESSING_QUEUE;
    private readonly BID_PRIORITY_QUEUE;
    private readonly NOTIFICATION_QUEUE;
    private readonly AUDIT_QUEUE;
    private readonly DEAD_LETTER_QUEUE;
    private readonly RETRY_QUEUE;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    private disconnect;
    private ensureConnection;
    private setupInfrastructure;
    publishBidEvent(routingKey: string, message: BidMessage | AuctionEventMessage, priority?: number): Promise<boolean>;
    publishBidForProcessing(bidMessage: BidMessage, isHighPriority?: boolean): Promise<boolean>;
    publishNotification(notification: NotificationMessage): Promise<boolean>;
    broadcastNotification(notification: Omit<NotificationMessage, "userId">): Promise<boolean>;
    publishAuditEvent(auditMessage: AuditMessage): Promise<boolean>;
    consumeBidProcessingQueue(callback: (message: BidMessage) => Promise<void>): Promise<void>;
    consumeBidPriorityQueue(callback: (message: BidMessage) => Promise<void>): Promise<void>;
    consumeNotificationQueue(callback: (message: NotificationMessage) => Promise<void>): Promise<void>;
    consumeAuditQueue(callback: (message: AuditMessage) => Promise<void>): Promise<void>;
    consumeDeadLetterQueue(callback: (message: any) => Promise<void>): Promise<void>;
    private handleFailedMessage;
    getQueueStats(): Promise<Record<string, {
        messageCount: number;
        consumerCount: number;
    }>>;
    purgeQueue(queueName: string): Promise<void>;
    gracefulShutdown(): Promise<void>;
    isConnected(): boolean;
    getChannel(): ConfirmChannel | null;
    getConnection(): Connection | null;
}

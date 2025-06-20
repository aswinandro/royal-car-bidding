import { type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import { type RedisClientType } from "redis";
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private client;
    private subscriber;
    private publisher;
    constructor(config: {
        host: string;
        port: number;
        password: string;
    });
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getClient(): RedisClientType;
    getSubscriber(): RedisClientType;
    getPublisher(): RedisClientType;
    set(key: string, value: string, ttl?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    publish(channel: string, message: string): Promise<void>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
    cacheHighestBid(auctionId: string, bidAmount: number, userId: string): Promise<void>;
    getHighestBid(auctionId: string): Promise<{
        amount: number;
        userId: string;
    } | null>;
}

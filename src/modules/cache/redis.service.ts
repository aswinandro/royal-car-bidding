// src/modules/cache/redis.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private redisClient: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      retryDelayOnReconnect: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    };

    this.redisClient = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    // Setup pub/sub for bid events
    this.subscriber.subscribe('bid:events');
    this.subscriber.on('message', this.handlePubSubMessage.bind(this));
  }

  async acquireLock(key: string, timeout: number): Promise<boolean> {
    const result = await this.redisClient.set(
      key,
      'locked',
      'PX',
      timeout,
      'NX'
    );
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async getAuctionState(auctionId: string) {
    const state = await this.redisClient.hgetall(`auction:${auctionId}:state`);
    return state ? {
      currentBid: parseFloat(state.currentBid || '0'),
      winnerId: state.winnerId,
      bidCount: parseInt(state.bidCount || '0'),
    } : null;
  }

  async updateAuctionState(auctionId: string, state: any) {
    await this.redisClient.hmset(`auction:${auctionId}:state`, state);
    await this.redisClient.expire(`auction:${auctionId}:state`, 3600); // 1 hour TTL
  }

  async incrementBidCount(auctionId: string): Promise<number> {
    return await this.redisClient.hincrby(`auction:${auctionId}:state`, 'bidCount', 1);
  }

  async setUserConnection(userId: string, socketId: string) {
    await this.redisClient.setex(`user:${userId}:connection`, 3600, socketId);
  }

  async removeUserConnection(userId: string) {
    await this.redisClient.del(`user:${userId}:connection`);
  }

  async publishBidEvent(event: any) {
    await this.publisher.publish('bid:events', JSON.stringify(event));
  }

  private handlePubSubMessage(channel: string, message: string) {
    if (channel === 'bid:events') {
      const event = JSON.parse(message);
      // Handle cross-instance bid synchronization
      console.log('Received bid event:', event);
    }
  }

  async cacheAuction(auctionId: string, auction: any) {
    await this.redisClient.setex(
      `auction:${auctionId}`,
      1800, // 30 minutes
      JSON.stringify(auction)
    );
  }

  async getCachedAuction(auctionId: string) {
    const cached = await this.redisClient.get(`auction:${auctionId}`);
    return cached ? JSON.parse(cached) : null;
  }
}
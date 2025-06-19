import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from "@nestjs/common"
import { createClient, type RedisClientType } from "redis"

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: RedisClientType
  private subscriber: RedisClientType
  private publisher: RedisClientType

  constructor(private readonly config: { host: string; port: number; password: string }) {}

  async onModuleInit() {
    const redisHost = this.config.host
    const redisPort = this.config.port
    const redisPassword = this.config.password

    const redisUrl = `redis://${redisHost}:${redisPort}`

    this.logger.log(`Connecting to Redis at ${redisUrl}`)

    // Create Redis clients
    this.client = createClient({
      url: redisUrl,
      password: redisPassword || undefined,
    })

    this.subscriber = this.client.duplicate()
    this.publisher = this.client.duplicate()

    // Connect clients
    await this.client.connect()
    await this.subscriber.connect()
    await this.publisher.connect()

    // Set up error handlers
    this.client.on("error", (err) => this.logger.error("Redis Client Error", err))
    this.subscriber.on("error", (err) => this.logger.error("Redis Subscriber Error", err))
    this.publisher.on("error", (err) => this.logger.error("Redis Publisher Error", err))

    this.logger.log("Redis service initialized successfully")
  }

  async onModuleDestroy() {
    await this.client.quit()
    await this.subscriber.quit()
    await this.publisher.quit()
    this.logger.log("Redis connections closed")
  }

  getClient(): RedisClientType {
    return this.client
  }

  getSubscriber(): RedisClientType {
    return this.subscriber
  }

  getPublisher(): RedisClientType {
    return this.publisher
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message)
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel)
  }

  async cacheHighestBid(auctionId: string, bidAmount: number, userId: string): Promise<void> {
    const bidData = JSON.stringify({ amount: bidAmount, userId })
    await this.set(`auction:${auctionId}:highestBid`, bidData)
  }

  async getHighestBid(auctionId: string): Promise<{ amount: number; userId: string } | null> {
    const data = await this.get(`auction:${auctionId}:highestBid`)
    return data ? JSON.parse(data) : null
  }
}

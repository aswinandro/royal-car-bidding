import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { RedisService } from "../redis/redis.service"
import { RabbitMQService } from "../rabbitmq/rabbitmq.service"
import { CreateBidDto } from "./dto/create-bid.dto"

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async create(createBidDto: CreateBidDto, userId: string) {
    // Start a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Check if auction exists and is active
      const auction = await prisma.auction.findUnique({
        where: { id: createBidDto.auctionId },
      })

      if (!auction) {
        throw new NotFoundException(`Auction with ID ${createBidDto.auctionId} not found`)
      }

      if (auction.status !== "ACTIVE") {
        throw new BadRequestException("Auction is not active")
      }

      if (auction.ownerId === userId) {
        throw new BadRequestException("You cannot bid on your own auction")
      }

      // Check if bid amount is valid
      const highestBid = await this.getHighestBid(createBidDto.auctionId)
      const minBidAmount = highestBid ? highestBid.amount + 1 : auction.startingBid

      if (createBidDto.amount < minBidAmount) {
        throw new BadRequestException(`Bid amount must be at least ${minBidAmount}`)
      }

      // Create bid
      const bid = await prisma.bid.create({
        data: {
          userId,
          auctionId: createBidDto.auctionId,
          amount: createBidDto.amount,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      // Update auction with current highest bid
      await prisma.auction.update({
        where: { id: createBidDto.auctionId },
        data: {
          currentBid: createBidDto.amount,
        },
      })

      // Cache the highest bid in Redis
      await this.redisService.cacheHighestBid(createBidDto.auctionId, createBidDto.amount, userId)

      // Publish bid event to RabbitMQ
      await this.rabbitMQService.publishBidEvent("bid.placed", {
        bidId: bid.id,
        userId,
        auctionId: createBidDto.auctionId,
        amount: createBidDto.amount,
        timestamp: bid.createdAt.toISOString(),
      })

      return bid
    })
  }

  async findByAuction(auctionId: string) {
    // Check if auction exists
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`)
    }

    // Get bids for auction
    return this.prisma.bid.findMany({
      where: { auctionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        amount: "desc",
      },
    })
  }

  async getHighestBid(auctionId: string) {
    // Try to get from Redis first
    const cachedBid = await this.redisService.getHighestBid(auctionId)

    if (cachedBid) {
      return {
        amount: cachedBid.amount,
        userId: cachedBid.userId,
      }
    }

    // If not in Redis, get from database
    const highestBid = await this.prisma.bid.findFirst({
      where: { auctionId },
      orderBy: {
        amount: "desc",
      },
    })

    if (highestBid) {
      // Cache the result for future queries
      await this.redisService.cacheHighestBid(auctionId, highestBid.amount, highestBid.userId)

      return {
        amount: highestBid.amount,
        userId: highestBid.userId,
      }
    }

    return null
  }
}

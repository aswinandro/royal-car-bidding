import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { RedisService } from "../redis/redis.service"
import type { RabbitMQService } from "../rabbitmq/rabbitmq.service"
import type { CreateAuctionDto } from "./dto/create-auction.dto"
import type { UpdateAuctionDto } from "./dto/update-auction.dto"

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, userId: string) {
    // Validate dates
    const startTime = new Date(createAuctionDto.startTime)
    const endTime = new Date(createAuctionDto.endTime)

    if (startTime < new Date()) {
      throw new BadRequestException("Start time must be in the future")
    }

    if (endTime <= startTime) {
      throw new BadRequestException("End time must be after start time")
    }

    // Check if car exists
    const car = await this.prisma.car.findUnique({
      where: { id: createAuctionDto.carId },
    })

    if (!car) {
      throw new NotFoundException(`Car with ID ${createAuctionDto.carId} not found`)
    }

    // Create auction
    const auction = await this.prisma.auction.create({
      data: {
        ...createAuctionDto,
        ownerId: userId,
        status: startTime <= new Date() ? "ACTIVE" : "PENDING",
      },
      include: {
        car: true,
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    // Publish auction created event
    await this.rabbitMQService.publishBidEvent("auction.created", {
      auctionId: auction.id,
      carId: auction.carId,
      startTime: auction.startTime,
      endTime: auction.endTime,
      startingBid: auction.startingBid,
    })

    return auction
  }

  async findAll(status?: string) {
    const where = status ? { status } : {}

    return this.prisma.auction.findMany({
      where,
      include: {
        car: true,
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        winner: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: { bids: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async findOne(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        car: true,
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        winner: {
          select: {
            id: true,
            username: true,
          },
        },
        bids: {
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
          take: 10,
        },
      },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`)
    }

    return auction
  }

  async update(id: string, updateAuctionDto: UpdateAuctionDto, userId: string) {
    // Check if auction exists and user is owner
    const auction = await this.prisma.auction.findUnique({
      where: { id },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`)
    }

    if (auction.ownerId !== userId) {
      throw new BadRequestException("You are not authorized to update this auction")
    }

    if (auction.status !== "PENDING") {
      throw new BadRequestException("Cannot update an active or ended auction")
    }

    // Update auction
    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: updateAuctionDto,
      include: {
        car: true,
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    // Publish auction updated event
    await this.rabbitMQService.publishBidEvent("auction.updated", {
      auctionId: updatedAuction.id,
      carId: updatedAuction.carId,
      startTime: updatedAuction.startTime,
      endTime: updatedAuction.endTime,
      startingBid: updatedAuction.startingBid,
    })

    return updatedAuction
  }

  async remove(id: string, userId: string) {
    // Check if auction exists and user is owner
    const auction = await this.prisma.auction.findUnique({
      where: { id },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`)
    }

    if (auction.ownerId !== userId) {
      throw new BadRequestException("You are not authorized to delete this auction")
    }

    if (auction.status !== "PENDING") {
      throw new BadRequestException("Cannot delete an active or ended auction")
    }

    // Delete auction
    const deletedAuction = await this.prisma.auction.delete({
      where: { id },
    })

    // Publish auction deleted event
    await this.rabbitMQService.publishBidEvent("auction.deleted", {
      auctionId: deletedAuction.id,
    })

    return deletedAuction
  }

  async startAuction(id: string) {
    // Check if auction exists
    const auction = await this.prisma.auction.findUnique({
      where: { id },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`)
    }

    if (auction.status !== "PENDING") {
      throw new BadRequestException("Auction is already active or ended")
    }

    // Update auction status
    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: {
        status: "ACTIVE",
        startTime: new Date(),
      },
    })

    // Publish auction started event
    await this.rabbitMQService.publishBidEvent("auction.started", {
      auctionId: updatedAuction.id,
    })

    return updatedAuction
  }

  async endAuction(id: string) {
    // Check if auction exists
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        bids: {
          orderBy: {
            amount: "desc",
          },
          take: 1,
        },
      },
    })

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`)
    }

    if (auction.status !== "ACTIVE") {
      throw new BadRequestException("Auction is not active")
    }

    // Get winner from highest bid
    const winnerId = auction.bids.length > 0 ? auction.bids[0].userId : null
    const winningBid = auction.bids.length > 0 ? auction.bids[0].amount : null

    // Update auction status
    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: {
        status: "ENDED",
        endTime: new Date(),
        winnerId,
        currentBid: winningBid,
      },
      include: {
        car: true,
        winner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    // Publish auction ended event
    await this.rabbitMQService.publishBidEvent("auction.ended", {
      auctionId: updatedAuction.id,
      winnerId: updatedAuction.winnerId,
      winningBid: updatedAuction.currentBid,
    })

    // Clear Redis cache for this auction
    await this.redisService.del(`auction:${id}:highestBid`)

    return updatedAuction
  }

  // Method to check and update auction status based on time
  async checkAndUpdateAuctionStatus() {
    const now = new Date()

    // Find pending auctions that should be active
    const pendingAuctions = await this.prisma.auction.findMany({
      where: {
        status: "PENDING",
        startTime: {
          lte: now,
        },
      },
    })

    // Find active auctions that should be ended
    const activeAuctions = await this.prisma.auction.findMany({
      where: {
        status: "ACTIVE",
        endTime: {
          lte: now,
        },
      },
    })

    // Update pending auctions to active
    for (const auction of pendingAuctions) {
      try {
        await this.startAuction(auction.id)
        this.logger.log(`Auction ${auction.id} automatically started`)
      } catch (error) {
        this.logger.error(`Failed to start auction ${auction.id}`, error)
      }
    }

    // Update active auctions to ended
    for (const auction of activeAuctions) {
      try {
        await this.endAuction(auction.id)
        this.logger.log(`Auction ${auction.id} automatically ended`)
      } catch (error) {
        this.logger.error(`Failed to end auction ${auction.id}`, error)
      }
    }

    return {
      started: pendingAuctions.length,
      ended: activeAuctions.length,
    }
  }
}

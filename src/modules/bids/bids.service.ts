// src/modules/bids/bids.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../cache/redis.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async placeBid(createBidDto: CreateBidDto) {
    const { userId, auctionId, amount } = createBidDto;

    // Use distributed lock to prevent race conditions
    const lockKey = `auction:${auctionId}:lock`;
    const lockAcquired = await this.redisService.acquireLock(lockKey, 5000); // 5 second timeout

    if (!lockAcquired) {
      throw new ConflictException('Another bid is being processed. Please try again.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get current auction with FOR UPDATE lock
        const auction = await tx.auction.findUnique({
          where: { id: auctionId },
          include: { car: true },
        });

        if (!auction) {
          throw new BadRequestException('Auction not found');
        }

        if (auction.status !== 'ACTIVE') {
          throw new BadRequestException('Auction is not active');
        }

        if (new Date() > auction.endTime) {
          throw new BadRequestException('Auction has ended');
        }

        if (amount <= auction.currentBid) {
          throw new BadRequestException('Bid must be higher than current bid');
        }

        // Create the bid
        const bid = await tx.bid.create({
          data: {
            userId,
            auctionId,
            amount,
          },
        });

        // Update auction with optimistic locking
        const updatedAuction = await tx.auction.update({
          where: { 
            id: auctionId,
            version: auction.version, // Optimistic locking
          },
          data: {
            currentBid: amount,
            winnerId: userId,
            version: auction.version + 1,
          },
        });

        return bid;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 second timeout
      });

    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException('Auction was updated by another user. Please refresh and try again.');
      }
      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async getBidHistory(auctionId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    return this.prisma.bid.findMany({
      where: { auctionId },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getUserBids(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    return this.prisma.bid.findMany({
      where: { userId },
      include: {
        auction: {
          include: { car: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
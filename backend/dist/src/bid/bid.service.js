"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BidService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const rabbitmq_service_1 = require("../rabbitmq/rabbitmq.service");
let BidService = BidService_1 = class BidService {
    constructor(prisma, redisService, rabbitMQService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.rabbitMQService = rabbitMQService;
        this.logger = new common_1.Logger(BidService_1.name);
    }
    async create(createBidDto, userId) {
        return this.prisma.$transaction(async (prisma) => {
            const auction = await prisma.auction.findUnique({
                where: { id: createBidDto.auctionId },
            });
            if (!auction) {
                throw new common_1.NotFoundException(`Auction with ID ${createBidDto.auctionId} not found`);
            }
            if (auction.status !== "ACTIVE") {
                throw new common_1.BadRequestException("Auction is not active");
            }
            if (auction.ownerId === userId) {
                throw new common_1.BadRequestException("You cannot bid on your own auction");
            }
            const highestBid = await this.getHighestBid(createBidDto.auctionId);
            const minBidAmount = highestBid ? highestBid.amount + 1 : auction.startingBid;
            if (createBidDto.amount < minBidAmount) {
                throw new common_1.BadRequestException(`Bid amount must be at least ${minBidAmount}`);
            }
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
            });
            await prisma.auction.update({
                where: { id: createBidDto.auctionId },
                data: {
                    currentBid: createBidDto.amount,
                },
            });
            await this.redisService.cacheHighestBid(createBidDto.auctionId, createBidDto.amount, userId);
            await this.rabbitMQService.publishBidEvent("bid.placed", {
                bidId: bid.id,
                userId,
                auctionId: createBidDto.auctionId,
                amount: createBidDto.amount,
                timestamp: bid.createdAt.toISOString(),
            });
            return bid;
        });
    }
    async findByAuction(auctionId) {
        const auction = await this.prisma.auction.findUnique({
            where: { id: auctionId },
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${auctionId} not found`);
        }
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
        });
    }
    async getHighestBid(auctionId) {
        const cachedBid = await this.redisService.getHighestBid(auctionId);
        if (cachedBid) {
            return {
                amount: cachedBid.amount,
                userId: cachedBid.userId,
            };
        }
        const highestBid = await this.prisma.bid.findFirst({
            where: { auctionId },
            orderBy: {
                amount: "desc",
            },
        });
        if (highestBid) {
            await this.redisService.cacheHighestBid(auctionId, highestBid.amount, highestBid.userId);
            return {
                amount: highestBid.amount,
                userId: highestBid.userId,
            };
        }
        return null;
    }
};
exports.BidService = BidService;
exports.BidService = BidService = BidService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        rabbitmq_service_1.RabbitMQService])
], BidService);
//# sourceMappingURL=bid.service.js.map
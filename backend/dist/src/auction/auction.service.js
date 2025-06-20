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
var AuctionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const rabbitmq_service_1 = require("../rabbitmq/rabbitmq.service");
let AuctionService = AuctionService_1 = class AuctionService {
    constructor(prisma, redisService, rabbitMQService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.rabbitMQService = rabbitMQService;
        this.logger = new common_1.Logger(AuctionService_1.name);
    }
    async create(createAuctionDto, userId) {
        const startTime = new Date(createAuctionDto.startTime);
        const endTime = new Date(createAuctionDto.endTime);
        if (startTime < new Date()) {
            throw new common_1.BadRequestException("Start time must be in the future");
        }
        if (endTime <= startTime) {
            throw new common_1.BadRequestException("End time must be after start time");
        }
        let carId = createAuctionDto.carId;
        if (createAuctionDto.carId === "temp" || !createAuctionDto.carId) {
            const carData = createAuctionDto;
            const car = await this.prisma.car.create({
                data: {
                    make: carData.make || "Unknown",
                    model: carData.model || "Unknown",
                    year: carData.year || new Date().getFullYear(),
                    description: carData.description || "No description",
                    imageUrl: carData.imageUrl || null,
                },
            });
            carId = car.id;
        }
        else {
            const car = await this.prisma.car.findUnique({
                where: { id: carId },
            });
            if (!car) {
                throw new common_1.NotFoundException(`Car with ID ${carId} not found`);
            }
        }
        const auction = await this.prisma.auction.create({
            data: {
                carId,
                ownerId: userId,
                startTime,
                endTime,
                startingBid: createAuctionDto.startingBid,
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
        });
        await this.rabbitMQService.publishBidEvent("auction.created", {
            auctionId: auction.id,
            eventType: "created",
            data: {
                carId: auction.carId,
                startTime: auction.startTime,
                endTime: auction.endTime,
                startingBid: auction.startingBid,
            },
            timestamp: new Date().toISOString(),
            userId,
        });
        return auction;
    }
    async findAll(status) {
        const where = status ? { status } : {};
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
        });
    }
    async findOne(id) {
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
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${id} not found`);
        }
        return auction;
    }
    async update(id, updateAuctionDto, userId) {
        const auction = await this.prisma.auction.findUnique({
            where: { id },
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${id} not found`);
        }
        if (auction.ownerId !== userId) {
            throw new common_1.BadRequestException("You are not authorized to update this auction");
        }
        if (auction.status !== "PENDING") {
            throw new common_1.BadRequestException("Cannot update an active or ended auction");
        }
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
        });
        await this.rabbitMQService.publishBidEvent("auction.updated", {
            auctionId: updatedAuction.id,
            eventType: "updated",
            data: {
                carId: updatedAuction.carId,
                startTime: updatedAuction.startTime,
                endTime: updatedAuction.endTime,
                startingBid: updatedAuction.startingBid,
            },
            timestamp: new Date().toISOString(),
            userId,
        });
        return updatedAuction;
    }
    async remove(id, userId) {
        const auction = await this.prisma.auction.findUnique({
            where: { id },
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${id} not found`);
        }
        if (auction.ownerId !== userId) {
            throw new common_1.BadRequestException("You are not authorized to delete this auction");
        }
        if (auction.status !== "PENDING") {
            throw new common_1.BadRequestException("Cannot delete an active or ended auction");
        }
        const deletedAuction = await this.prisma.auction.delete({
            where: { id },
        });
        await this.rabbitMQService.publishBidEvent("auction.deleted", {
            auctionId: deletedAuction.id,
            eventType: "deleted",
            data: {
                auctionId: deletedAuction.id,
            },
            timestamp: new Date().toISOString(),
            userId,
        });
        return deletedAuction;
    }
    async startAuction(id) {
        const auction = await this.prisma.auction.findUnique({
            where: { id },
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${id} not found`);
        }
        if (auction.status !== "PENDING") {
            throw new common_1.BadRequestException("Auction is already active or ended");
        }
        const updatedAuction = await this.prisma.auction.update({
            where: { id },
            data: {
                status: "ACTIVE",
                startTime: new Date(),
            },
        });
        await this.rabbitMQService.publishBidEvent("auction.started", {
            auctionId: updatedAuction.id,
            eventType: "started",
            data: {
                auctionId: updatedAuction.id,
            },
            timestamp: new Date().toISOString(),
        });
        return updatedAuction;
    }
    async endAuction(id) {
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
        });
        if (!auction) {
            throw new common_1.NotFoundException(`Auction with ID ${id} not found`);
        }
        if (auction.status !== "ACTIVE") {
            throw new common_1.BadRequestException("Auction is not active");
        }
        const winnerId = auction.bids.length > 0 ? auction.bids[0].userId : null;
        const winningBid = auction.bids.length > 0 ? auction.bids[0].amount : null;
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
        });
        await this.rabbitMQService.publishBidEvent("auction.ended", {
            auctionId: updatedAuction.id,
            eventType: "ended",
            data: {
                auctionId: updatedAuction.id,
                winnerId: updatedAuction.winnerId,
                winningBid: updatedAuction.currentBid,
            },
            timestamp: new Date().toISOString(),
        });
        await this.redisService.del(`auction:${id}:highestBid`);
        return updatedAuction;
    }
    async checkAndUpdateAuctionStatus() {
        const now = new Date();
        const pendingAuctions = await this.prisma.auction.findMany({
            where: {
                status: "PENDING",
                startTime: {
                    lte: now,
                },
            },
        });
        const activeAuctions = await this.prisma.auction.findMany({
            where: {
                status: "ACTIVE",
                endTime: {
                    lte: now,
                },
            },
        });
        for (const auction of pendingAuctions) {
            try {
                await this.startAuction(auction.id);
                this.logger.log(`Auction ${auction.id} automatically started`);
            }
            catch (error) {
                this.logger.error(`Failed to start auction ${auction.id}`, error);
            }
        }
        for (const auction of activeAuctions) {
            try {
                await this.endAuction(auction.id);
                this.logger.log(`Auction ${auction.id} automatically ended`);
            }
            catch (error) {
                this.logger.error(`Failed to end auction ${auction.id}`, error);
            }
        }
        return {
            started: pendingAuctions.length,
            ended: activeAuctions.length,
        };
    }
};
exports.AuctionService = AuctionService;
exports.AuctionService = AuctionService = AuctionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        rabbitmq_service_1.RabbitMQService])
], AuctionService);
//# sourceMappingURL=auction.service.js.map
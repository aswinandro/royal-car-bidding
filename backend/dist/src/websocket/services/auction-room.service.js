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
var AuctionRoomService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionRoomService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const bid_service_1 = require("../../bid/bid.service");
const auction_service_1 = require("../../auction/auction.service");
const websocket_service_1 = require("../websocket.service");
let AuctionRoomService = AuctionRoomService_1 = class AuctionRoomService {
    constructor(prismaService, redisService, bidService, auctionService, websocketService) {
        this.prismaService = prismaService;
        this.redisService = redisService;
        this.bidService = bidService;
        this.auctionService = auctionService;
        this.websocketService = websocketService;
        this.logger = new common_1.Logger(AuctionRoomService_1.name);
        this.auctionRooms = new Map();
    }
    initialize(server) {
        this.server = server;
        this.logger.log("Auction Room Service initialized");
    }
    async joinAuctionRoom(socket, auctionId, userId) {
        const auction = await this.validateAuction(auctionId);
        let room = this.auctionRooms.get(auctionId);
        if (!room) {
            room = await this.createAuctionRoom(auctionId, auction);
        }
        const existingParticipant = Array.from(room.participants.values()).find((p) => p.userId === userId);
        if (existingParticipant) {
            room.participants.set(socket.id, {
                userId,
                socketId: socket.id,
                joinedAt: existingParticipant.joinedAt,
            });
        }
        else {
            room.participants.set(socket.id, {
                userId,
                socketId: socket.id,
                joinedAt: new Date(),
            });
        }
        socket.join(`auction:${auctionId}`);
        this.websocketService.addClientToRoom(socket.id, `auction:${auctionId}`);
        room.lastActivity = new Date();
        await this.cacheRoomInfo(auctionId, room);
        this.logger.log(`User ${userId} joined auction room ${auctionId}`);
        return {
            auctionId,
            participantCount: room.participants.size,
            currentHighestBid: room.currentHighestBid,
            bidCount: room.bidCount,
            status: room.status,
        };
    }
    async leaveAuctionRoom(socket, auctionId, userId) {
        const room = this.auctionRooms.get(auctionId);
        if (!room)
            return;
        room.participants.delete(socket.id);
        socket.leave(`auction:${auctionId}`);
        this.websocketService.removeClientFromRoom(socket.id, `auction:${auctionId}`);
        room.lastActivity = new Date();
        await this.cacheRoomInfo(auctionId, room);
        if (room.participants.size === 0) {
            this.auctionRooms.delete(auctionId);
            await this.redisService.del(`auction:room:${auctionId}`);
        }
        this.logger.log(`User ${userId} left auction room ${auctionId}`);
    }
    async removeClientFromAllRooms(socket) {
        for (const [auctionId, room] of this.auctionRooms.entries()) {
            if (room.participants.has(socket.id)) {
                const participant = room.participants.get(socket.id);
                await this.leaveAuctionRoom(socket, auctionId, participant.userId);
            }
        }
    }
    async processBid(socket, auctionId, userId, amount) {
        const room = this.auctionRooms.get(auctionId);
        if (!room) {
            throw new common_1.BadRequestException("Auction room not found");
        }
        if (room.status !== "ACTIVE") {
            throw new common_1.BadRequestException("Auction is not active");
        }
        const previousHighest = room.currentHighestBid;
        try {
            const bid = await this.bidService.create({ auctionId, amount }, userId);
            room.currentHighestBid = amount;
            room.bidCount += 1;
            room.lastActivity = new Date();
            await this.cacheRoomInfo(auctionId, room);
            await this.redisService.cacheHighestBid(auctionId, amount, userId);
            this.logger.log(`Bid processed: ${amount} by ${userId} in auction ${auctionId}`);
            return {
                bid,
                position: 1,
                previousHighest,
            };
        }
        catch (error) {
            this.logger.error(`Bid processing failed:`, error);
            throw error;
        }
    }
    async getAuctionStatus(auctionId) {
        const room = this.auctionRooms.get(auctionId);
        if (room) {
            return {
                status: room.status,
                participantCount: room.participants.size,
                currentHighestBid: room.currentHighestBid,
                bidCount: room.bidCount,
                lastActivity: room.lastActivity,
            };
        }
        const auction = await this.prismaService.auction.findUnique({
            where: { id: auctionId },
            include: { _count: { select: { bids: true } } },
        });
        if (!auction) {
            throw new common_1.NotFoundException("Auction not found");
        }
        return {
            status: auction.status,
            participantCount: 0,
            currentHighestBid: auction.currentBid,
            bidCount: auction._count.bids,
            lastActivity: auction.updatedAt,
        };
    }
    async getRoomParticipants(auctionId) {
        const room = this.auctionRooms.get(auctionId);
        if (!room)
            return [];
        return Array.from(room.participants.values()).map((p) => ({
            userId: p.userId,
            joinedAt: p.joinedAt,
        }));
    }
    async canUserStartAuction(auctionId, userId) {
        const auction = await this.prismaService.auction.findUnique({
            where: { id: auctionId },
        });
        return auction?.ownerId === userId;
    }
    async canUserEndAuction(auctionId, userId) {
        const auction = await this.prismaService.auction.findUnique({
            where: { id: auctionId },
        });
        return auction?.ownerId === userId;
    }
    async startAuction(auctionId) {
        const result = await this.auctionService.startAuction(auctionId);
        const room = this.auctionRooms.get(auctionId);
        if (room) {
            room.status = "ACTIVE";
            room.lastActivity = new Date();
            await this.cacheRoomInfo(auctionId, room);
        }
        return result;
    }
    async endAuction(auctionId) {
        const result = await this.auctionService.endAuction(auctionId);
        const room = this.auctionRooms.get(auctionId);
        if (room) {
            room.status = "ENDED";
            room.lastActivity = new Date();
            await this.cacheRoomInfo(auctionId, room);
        }
        return result;
    }
    async validateAuction(auctionId) {
        const auction = await this.prismaService.auction.findUnique({
            where: { id: auctionId },
            include: { car: true },
        });
        if (!auction) {
            throw new common_1.NotFoundException("Auction not found");
        }
        return auction;
    }
    async createAuctionRoom(auctionId, auction) {
        const room = {
            auctionId,
            participants: new Map(),
            currentHighestBid: auction.currentBid,
            bidCount: 0,
            status: auction.status,
            createdAt: new Date(),
            lastActivity: new Date(),
        };
        this.auctionRooms.set(auctionId, room);
        const bidCount = await this.prismaService.bid.count({
            where: { auctionId },
        });
        room.bidCount = bidCount;
        this.logger.log(`Created auction room for ${auctionId}`);
        return room;
    }
    async cacheRoomInfo(auctionId, room) {
        const roomInfo = {
            auctionId: room.auctionId,
            participantCount: room.participants.size,
            currentHighestBid: room.currentHighestBid,
            bidCount: room.bidCount,
            status: room.status,
            lastActivity: room.lastActivity.toISOString(),
        };
        await this.redisService.set(`auction:room:${auctionId}`, JSON.stringify(roomInfo), 300);
    }
    async cleanupInactiveRooms() {
        const now = new Date();
        const inactiveThreshold = 60 * 60 * 1000;
        for (const [auctionId, room] of this.auctionRooms.entries()) {
            if (now.getTime() - room.lastActivity.getTime() > inactiveThreshold) {
                this.logger.warn(`Cleaning up inactive auction room: ${auctionId}`);
                this.auctionRooms.delete(auctionId);
                await this.redisService.del(`auction:room:${auctionId}`);
            }
        }
    }
    getRoomStats() {
        return {
            totalRooms: this.auctionRooms.size,
            totalParticipants: Array.from(this.auctionRooms.values()).reduce((sum, room) => sum + room.participants.size, 0),
            activeRooms: Array.from(this.auctionRooms.values()).filter((room) => room.status === "ACTIVE").length,
        };
    }
};
exports.AuctionRoomService = AuctionRoomService;
exports.AuctionRoomService = AuctionRoomService = AuctionRoomService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        bid_service_1.BidService,
        auction_service_1.AuctionService,
        websocket_service_1.WebSocketService])
], AuctionRoomService);
//# sourceMappingURL=auction-room.service.js.map
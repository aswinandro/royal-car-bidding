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
var AuctionRoomGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionRoomGuard = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuctionRoomGuard = AuctionRoomGuard_1 = class AuctionRoomGuard {
    constructor(prismaService) {
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(AuctionRoomGuard_1.name);
    }
    async canActivate(context) {
        try {
            const client = context.switchToWs().getClient();
            const data = context.switchToWs().getData();
            const user = client.data.user;
            if (!user) {
                throw new websockets_1.WsException("User not authenticated");
            }
            if (!data.auctionId) {
                throw new websockets_1.WsException("Auction ID required");
            }
            const auction = await this.prismaService.auction.findUnique({
                where: { id: data.auctionId },
            });
            if (!auction) {
                throw new websockets_1.WsException("Auction not found");
            }
            if (auction.ownerId === user.sub) {
                if (context.getHandler().name === "handlePlaceBid") {
                    throw new websockets_1.WsException("Cannot bid on your own auction");
                }
            }
            if (context.getHandler().name === "handlePlaceBid") {
                if (auction.status !== "ACTIVE") {
                    throw new websockets_1.WsException("Auction is not active");
                }
                if (auction.endTime && new Date() > auction.endTime) {
                    throw new websockets_1.WsException("Auction has ended");
                }
            }
            return true;
        }
        catch (error) {
            this.logger.error("Auction Room Guard Error", error);
            if (error instanceof websockets_1.WsException) {
                throw error;
            }
            throw new websockets_1.WsException("Access denied");
        }
    }
};
exports.AuctionRoomGuard = AuctionRoomGuard;
exports.AuctionRoomGuard = AuctionRoomGuard = AuctionRoomGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuctionRoomGuard);
//# sourceMappingURL=auction-room.guard.js.map
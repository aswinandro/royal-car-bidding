import { Server, Socket } from "socket.io";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BidService } from "../../bid/bid.service";
import { AuctionService } from "../../auction/auction.service";
import { WebSocketService } from "../websocket.service";
interface BidResult {
    bid: any;
    position: number;
    previousHighest: number | null;
}
export declare class AuctionRoomService {
    private readonly prismaService;
    private readonly redisService;
    private readonly bidService;
    private readonly auctionService;
    private readonly websocketService;
    private readonly logger;
    private server;
    private auctionRooms;
    constructor(prismaService: PrismaService, redisService: RedisService, bidService: BidService, auctionService: AuctionService, websocketService: WebSocketService);
    initialize(server: Server): void;
    joinAuctionRoom(socket: Socket, auctionId: string, userId: string): Promise<{
        auctionId: string;
        participantCount: number;
        currentHighestBid: number;
        bidCount: number;
        status: string;
    }>;
    leaveAuctionRoom(socket: Socket, auctionId: string, userId: string): Promise<void>;
    removeClientFromAllRooms(socket: Socket): Promise<void>;
    processBid(socket: Socket, auctionId: string, userId: string, amount: number): Promise<BidResult>;
    getAuctionStatus(auctionId: string): Promise<{
        status: string;
        participantCount: number;
        currentHighestBid: number;
        bidCount: number;
        lastActivity: Date;
    }>;
    getRoomParticipants(auctionId: string): Promise<{
        userId: string;
        joinedAt: Date;
    }[]>;
    canUserStartAuction(auctionId: string, userId: string): Promise<boolean>;
    canUserEndAuction(auctionId: string, userId: string): Promise<boolean>;
    startAuction(auctionId: string): Promise<{
        id: string;
        carId: string;
        ownerId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    endAuction(auctionId: string): Promise<{
        car: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            description: string;
            imageUrl: string | null;
        };
        winner: {
            id: string;
            username: string;
        };
    } & {
        id: string;
        carId: string;
        ownerId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private validateAuction;
    private createAuctionRoom;
    private cacheRoomInfo;
    cleanupInactiveRooms(): Promise<void>;
    getRoomStats(): {
        totalRooms: number;
        totalParticipants: number;
        activeRooms: number;
    };
}
export {};

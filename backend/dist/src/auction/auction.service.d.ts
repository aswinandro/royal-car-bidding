import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { CreateAuctionDto } from "./dto/create-auction.dto";
import { UpdateAuctionDto } from "./dto/update-auction.dto";
export declare class AuctionService {
    private readonly prisma;
    private readonly redisService;
    private readonly rabbitMQService;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, rabbitMQService: RabbitMQService);
    create(createAuctionDto: CreateAuctionDto, userId: string): Promise<{
        car: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            imageUrl: string | null;
        };
        owner: {
            username: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    findAll(status?: string): Promise<({
        car: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            imageUrl: string | null;
        };
        _count: {
            bids: number;
        };
        owner: {
            username: string;
            id: string;
        };
        winner: {
            username: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    })[]>;
    findOne(id: string): Promise<{
        car: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            imageUrl: string | null;
        };
        bids: ({
            user: {
                username: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            amount: number;
            auctionId: string;
        })[];
        owner: {
            username: string;
            id: string;
        };
        winner: {
            username: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    update(id: string, updateAuctionDto: UpdateAuctionDto, userId: string): Promise<{
        car: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            imageUrl: string | null;
        };
        owner: {
            username: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    remove(id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    startAuction(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    endAuction(id: string): Promise<{
        car: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            make: string;
            model: string;
            year: number;
            imageUrl: string | null;
        };
        winner: {
            username: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        carId: string;
        startTime: Date;
        endTime: Date;
        startingBid: number;
        ownerId: string;
        currentBid: number | null;
        winnerId: string | null;
        status: string;
    }>;
    checkAndUpdateAuctionStatus(): Promise<{
        started: number;
        ended: number;
    }>;
}

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { CreateBidDto } from "./dto/create-bid.dto";
export declare class BidService {
    private readonly prisma;
    private readonly redisService;
    private readonly rabbitMQService;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, rabbitMQService: RabbitMQService);
    create(createBidDto: CreateBidDto, userId: string): Promise<{
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
    }>;
    findByAuction(auctionId: string): Promise<({
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
    })[]>;
    getHighestBid(auctionId: string): Promise<{
        amount: number;
        userId: string;
    }>;
}

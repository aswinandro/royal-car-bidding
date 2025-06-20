import { AuctionService } from "./auction.service";
import { CreateAuctionDto } from "./dto/create-auction.dto";
import { UpdateAuctionDto } from "./dto/update-auction.dto";
export declare class AuctionController {
    private readonly auctionService;
    constructor(auctionService: AuctionService);
    create(createAuctionDto: CreateAuctionDto, req: any): Promise<{
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
        owner: {
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
    findAll(status?: string): Promise<({
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
        owner: {
            id: string;
            username: string;
        };
        winner: {
            id: string;
            username: string;
        };
        _count: {
            bids: number;
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
    })[]>;
    findOne(id: string): Promise<{
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
        owner: {
            id: string;
            username: string;
        };
        winner: {
            id: string;
            username: string;
        };
        bids: ({
            user: {
                id: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            amount: number;
            userId: string;
            auctionId: string;
        })[];
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
    update(id: string, updateAuctionDto: UpdateAuctionDto, req: any): Promise<{
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
        owner: {
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
    remove(id: string, req: any): Promise<{
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
    startAuction(id: string): Promise<{
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
    endAuction(id: string): Promise<{
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
}

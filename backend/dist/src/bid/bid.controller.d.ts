import { BidService } from "./bid.service";
import { CreateBidDto } from "./dto/create-bid.dto";
export declare class BidController {
    private readonly bidService;
    constructor(bidService: BidService);
    create(createBidDto: CreateBidDto, req: any): Promise<{
        user: {
            id: string;
            username: string;
        };
    } & {
        id: string;
        userId: string;
        auctionId: string;
        amount: number;
        createdAt: Date;
    }>;
    findByAuction(auctionId: string): Promise<({
        user: {
            id: string;
            username: string;
        };
    } & {
        id: string;
        userId: string;
        auctionId: string;
        amount: number;
        createdAt: Date;
    })[]>;
    getHighestBid(auctionId: string): Promise<{
        amount: number;
        userId: string;
    }>;
}

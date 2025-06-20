import { type CanActivate, type ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
export declare class AuctionRoomGuard implements CanActivate {
    private readonly prismaService;
    private readonly logger;
    constructor(prismaService: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}

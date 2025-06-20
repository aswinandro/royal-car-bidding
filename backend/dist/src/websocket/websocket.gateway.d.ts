import { type OnGatewayConnection, type OnGatewayDisconnect, type OnGatewayInit } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { WebSocketService } from "./websocket.service";
import { AuctionRoomService } from "./services/auction-room.service";
import { JoinRoomDto, PlaceBidDto, LeaveRoomDto } from "./dto/websocket.dto";
export declare class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly configService;
    private readonly websocketService;
    private readonly auctionRoomService;
    private readonly logger;
    server: Server;
    constructor(jwtService: JwtService, configService: ConfigService, websocketService: WebSocketService, auctionRoomService: AuctionRoomService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinAuction(client: Socket, data: JoinRoomDto): Promise<{
        success: boolean;
        roomInfo: {
            auctionId: string;
            participantCount: number;
            currentHighestBid: number;
            bidCount: number;
            status: string;
        };
    }>;
    handleLeaveAuction(client: Socket, data: LeaveRoomDto): Promise<{
        success: boolean;
    }>;
    handlePlaceBid(client: Socket, data: PlaceBidDto): Promise<{
        success: boolean;
        bid: any;
    }>;
    handleGetAuctionStatus(client: Socket, data: {
        auctionId: string;
    }): Promise<{
        success: boolean;
        status: {
            status: string;
            participantCount: number;
            currentHighestBid: number;
            bidCount: number;
            lastActivity: Date;
        };
    }>;
    handleGetRoomParticipants(client: Socket, data: {
        auctionId: string;
    }): Promise<{
        success: boolean;
        participants: {
            userId: string;
            joinedAt: Date;
        }[];
    }>;
    handleStartAuction(client: Socket, data: {
        auctionId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleEndAuction(client: Socket, data: {
        auctionId: string;
    }): Promise<{
        success: boolean;
        result: {
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
        };
    }>;
    broadcastBidUpdate(auctionId: string, bidData: any): void;
}

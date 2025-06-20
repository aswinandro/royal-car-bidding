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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebsocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const ws_jwt_guard_1 = require("./guards/ws-jwt.guard");
const ws_throttler_guard_1 = require("./guards/ws-throttler.guard");
const auction_room_guard_1 = require("./guards/auction-room.guard");
const websocket_service_1 = require("./websocket.service");
const auction_room_service_1 = require("./services/auction-room.service");
const bid_validation_pipe_1 = require("./pipes/bid-validation.pipe");
const websocket_dto_1 = require("./dto/websocket.dto");
let WebsocketGateway = WebsocketGateway_1 = class WebsocketGateway {
    constructor(jwtService, configService, websocketService, auctionRoomService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.websocketService = websocketService;
        this.auctionRoomService = auctionRoomService;
        this.logger = new common_1.Logger(WebsocketGateway_1.name);
    }
    afterInit(server) {
        this.logger.log("WebSocket Gateway initialized");
        this.websocketService.setServer(server);
        this.auctionRoomService.initialize(server);
        const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:5173";
        this.logger.log(`CORS allowed origins: ${frontendUrl}`);
    }
    async handleConnection(client) {
        try {
            this.logger.log(`Client attempting connection: ${client.id}`);
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(" ")[1];
            if (!token) {
                this.logger.warn(`Client ${client.id} not authenticated`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.user = payload;
            await this.websocketService.registerClient(client, payload);
            this.logger.log(`Client ${client.id} authenticated as user ${payload.sub}`);
            client.emit("connected", {
                message: "Successfully connected to auction system",
                userId: payload.sub,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
            client.emit("error", { message: "Authentication failed" });
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnecting: ${client.id}`);
        try {
            await this.websocketService.unregisterClient(client);
            await this.auctionRoomService.removeClientFromAllRooms(client);
            this.logger.log(`Client ${client.id} cleanup completed`);
        }
        catch (error) {
            this.logger.error(`Error during client ${client.id} cleanup:`, error);
        }
    }
    async handleJoinAuction(client, data) {
        try {
            const { auctionId } = data;
            const userId = client.data.user.sub;
            this.logger.log(`User ${userId} joining auction room: ${auctionId}`);
            const roomInfo = await this.auctionRoomService.joinAuctionRoom(client, auctionId, userId);
            client.emit("joinedAuction", {
                auctionId,
                roomInfo,
                timestamp: new Date().toISOString(),
            });
            client.to(`auction:${auctionId}`).emit("userJoined", {
                userId,
                username: client.data.user.email,
                participantCount: roomInfo.participantCount,
                timestamp: new Date().toISOString(),
            });
            return { success: true, roomInfo };
        }
        catch (error) {
            this.logger.error(`Error joining auction room:`, error);
            throw new websockets_1.WsException(error.message || "Failed to join auction room");
        }
    }
    async handleLeaveAuction(client, data) {
        try {
            const { auctionId } = data;
            const userId = client.data.user.sub;
            this.logger.log(`User ${userId} leaving auction room: ${auctionId}`);
            await this.auctionRoomService.leaveAuctionRoom(client, auctionId, userId);
            client.to(`auction:${auctionId}`).emit("userLeft", {
                userId,
                username: client.data.user.email,
                timestamp: new Date().toISOString(),
            });
            client.emit("leftAuction", {
                auctionId,
                timestamp: new Date().toISOString(),
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error leaving auction room:`, error);
            throw new websockets_1.WsException(error.message || "Failed to leave auction room");
        }
    }
    async handlePlaceBid(client, data) {
        try {
            const { auctionId, amount } = data;
            const userId = client.data.user.sub;
            this.logger.log(`Bid attempt from ${userId} for auction ${auctionId}: $${amount}`);
            const bidResult = await this.auctionRoomService.processBid(client, auctionId, userId, amount);
            this.server.to(`auction:${auctionId}`).emit("bidPlaced", {
                bidId: bidResult.bid.id,
                auctionId,
                userId,
                username: client.data.user.email,
                amount,
                timestamp: bidResult.bid.createdAt,
                isHighest: true,
                previousHighest: bidResult.previousHighest,
            });
            client.emit("bidConfirmed", {
                bidId: bidResult.bid.id,
                amount,
                position: bidResult.position,
                timestamp: bidResult.bid.createdAt,
            });
            return { success: true, bid: bidResult.bid };
        }
        catch (error) {
            this.logger.error(`Bid placement error:`, error);
            client.emit("bidError", {
                auctionId: data.auctionId,
                error: error.message,
                timestamp: new Date().toISOString(),
            });
            throw new websockets_1.WsException(error.message || "Failed to place bid");
        }
    }
    async handleGetAuctionStatus(client, data) {
        try {
            const status = await this.auctionRoomService.getAuctionStatus(data.auctionId);
            client.emit("auctionStatus", {
                auctionId: data.auctionId,
                status,
                timestamp: new Date().toISOString(),
            });
            return { success: true, status };
        }
        catch (error) {
            this.logger.error(`Error getting auction status:`, error);
            throw new websockets_1.WsException(error.message || "Failed to get auction status");
        }
    }
    async handleGetRoomParticipants(client, data) {
        try {
            const participants = await this.auctionRoomService.getRoomParticipants(data.auctionId);
            client.emit("roomParticipants", {
                auctionId: data.auctionId,
                participants,
                count: participants.length,
                timestamp: new Date().toISOString(),
            });
            return { success: true, participants };
        }
        catch (error) {
            this.logger.error(`Error getting room participants:`, error);
            throw new websockets_1.WsException(error.message || "Failed to get room participants");
        }
    }
    async handleStartAuction(client, data) {
        try {
            const canStart = await this.auctionRoomService.canUserStartAuction(data.auctionId, client.data.user.sub);
            if (!canStart) {
                throw new websockets_1.WsException("Unauthorized to start this auction");
            }
            await this.auctionRoomService.startAuction(data.auctionId);
            this.server.to(`auction:${data.auctionId}`).emit("auctionStarted", {
                auctionId: data.auctionId,
                startedBy: client.data.user.sub,
                timestamp: new Date().toISOString(),
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error starting auction:`, error);
            throw new websockets_1.WsException(error.message || "Failed to start auction");
        }
    }
    async handleEndAuction(client, data) {
        try {
            const canEnd = await this.auctionRoomService.canUserEndAuction(data.auctionId, client.data.user.sub);
            if (!canEnd) {
                throw new websockets_1.WsException("Unauthorized to end this auction");
            }
            const result = await this.auctionRoomService.endAuction(data.auctionId);
            this.server.to(`auction:${data.auctionId}`).emit("auctionEnded", {
                auctionId: data.auctionId,
                winner: result.winner,
                winningBid: result.currentBid,
                endedBy: client.data.user.sub,
                timestamp: new Date().toISOString(),
            });
            return { success: true, result };
        }
        catch (error) {
            this.logger.error(`Error ending auction:`, error);
            throw new websockets_1.WsException(error.message || "Failed to end auction");
        }
    }
    broadcastBidUpdate(auctionId, bidData) {
        if (this.server) {
            this.server.to(`auction:${auctionId}`).emit("bidPlaced", bidData);
        }
    }
};
exports.WebsocketGateway = WebsocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], WebsocketGateway.prototype, "server", void 0);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    (0, websockets_1.SubscribeMessage)("joinAuction"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, websocket_dto_1.JoinRoomDto]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleJoinAuction", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    (0, websockets_1.SubscribeMessage)("leaveAuction"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, websocket_dto_1.LeaveRoomDto]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleLeaveAuction", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard, ws_throttler_guard_1.WsThrottlerGuard, auction_room_guard_1.AuctionRoomGuard),
    (0, common_1.UsePipes)(new bid_validation_pipe_1.BidValidationPipe()),
    (0, websockets_1.SubscribeMessage)("placeBid"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, websocket_dto_1.PlaceBidDto]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handlePlaceBid", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("getAuctionStatus"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleGetAuctionStatus", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("getRoomParticipants"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleGetRoomParticipants", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("startAuction"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleStartAuction", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("endAuction"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleEndAuction", null);
exports.WebsocketGateway = WebsocketGateway = WebsocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: (origin, callback) => {
                const allowedOrigins = [
                    process.env.FRONTEND_URL || "http://localhost:5173",
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:3001",
                ];
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
        },
        namespace: "/",
        transports: ["websocket", "polling"],
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        websocket_service_1.WebSocketService,
        auction_room_service_1.AuctionRoomService])
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map
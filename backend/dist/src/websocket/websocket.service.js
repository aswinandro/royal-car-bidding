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
var WebSocketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let WebSocketService = WebSocketService_1 = class WebSocketService {
    constructor(redisService) {
        this.redisService = redisService;
        this.logger = new common_1.Logger(WebSocketService_1.name);
        this.connectedClients = new Map();
        this.userSockets = new Map();
    }
    setServer(server) {
        this.server = server;
    }
    async registerClient(socket, user) {
        const clientInfo = {
            socket,
            userId: user.sub,
            connectedAt: new Date(),
            lastActivity: new Date(),
            rooms: new Set(),
        };
        this.connectedClients.set(socket.id, clientInfo);
        if (!this.userSockets.has(user.sub)) {
            this.userSockets.set(user.sub, new Set());
        }
        this.userSockets.get(user.sub).add(socket.id);
        await this.redisService.set(`ws:client:${socket.id}`, JSON.stringify({
            userId: user.sub,
            connectedAt: clientInfo.connectedAt.toISOString(),
        }), 3600);
        this.logger.log(`Client registered: ${socket.id} for user ${user.sub}`);
    }
    async unregisterClient(socket) {
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo) {
            const userSockets = this.userSockets.get(clientInfo.userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    this.userSockets.delete(clientInfo.userId);
                }
            }
            for (const room of clientInfo.rooms) {
                socket.leave(room);
            }
            this.connectedClients.delete(socket.id);
        }
        await this.redisService.del(`ws:client:${socket.id}`);
        this.logger.log(`Client unregistered: ${socket.id}`);
    }
    getConnectedClient(socketId) {
        return this.connectedClients.get(socketId);
    }
    getUserSockets(userId) {
        const socketIds = this.userSockets.get(userId);
        if (!socketIds)
            return [];
        return Array.from(socketIds)
            .map((id) => this.connectedClients.get(id)?.socket)
            .filter(Boolean);
    }
    addClientToRoom(socketId, room) {
        const client = this.connectedClients.get(socketId);
        if (client) {
            client.rooms.add(room);
            client.lastActivity = new Date();
        }
    }
    removeClientFromRoom(socketId, room) {
        const client = this.connectedClients.get(socketId);
        if (client) {
            client.rooms.delete(room);
            client.lastActivity = new Date();
        }
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
    getConnectedUsersCount() {
        return this.userSockets.size;
    }
    getRoomParticipants(room) {
        return Array.from(this.connectedClients.values()).filter((client) => client.rooms.has(room));
    }
    async broadcastToRoom(room, event, data) {
        if (this.server) {
            this.server.to(room).emit(event, data);
            await this.redisService.publish(`ws:room:${room}`, JSON.stringify({
                event,
                data,
                timestamp: new Date().toISOString(),
            }));
        }
    }
    async broadcastToUser(userId, event, data) {
        const userSockets = this.getUserSockets(userId);
        for (const socket of userSockets) {
            socket.emit(event, data);
        }
        await this.redisService.publish(`ws:user:${userId}`, JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString(),
        }));
    }
    async cleanupInactiveClients() {
        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000;
        for (const [socketId, client] of this.connectedClients.entries()) {
            if (now.getTime() - client.lastActivity.getTime() > inactiveThreshold) {
                this.logger.warn(`Cleaning up inactive client: ${socketId}`);
                client.socket.disconnect();
                await this.unregisterClient(client.socket);
            }
        }
    }
    getServerStats() {
        return {
            connectedClients: this.getConnectedClientsCount(),
            connectedUsers: this.getConnectedUsersCount(),
            rooms: Array.from(this.connectedClients.values())
                .flatMap((client) => Array.from(client.rooms))
                .filter((room, index, arr) => arr.indexOf(room) === index),
        };
    }
};
exports.WebSocketService = WebSocketService;
exports.WebSocketService = WebSocketService = WebSocketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], WebSocketService);
//# sourceMappingURL=websocket.service.js.map
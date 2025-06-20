import { Server, Socket } from "socket.io";
import { RedisService } from "../redis/redis.service";
interface ConnectedClient {
    socket: Socket;
    userId: string;
    connectedAt: Date;
    lastActivity: Date;
    rooms: Set<string>;
}
export declare class WebSocketService {
    private readonly redisService;
    private readonly logger;
    private server;
    private connectedClients;
    private userSockets;
    constructor(redisService: RedisService);
    setServer(server: Server): void;
    registerClient(socket: Socket, user: any): Promise<void>;
    unregisterClient(socket: Socket): Promise<void>;
    getConnectedClient(socketId: string): ConnectedClient | undefined;
    getUserSockets(userId: string): Socket[];
    addClientToRoom(socketId: string, room: string): void;
    removeClientFromRoom(socketId: string, room: string): void;
    getConnectedClientsCount(): number;
    getConnectedUsersCount(): number;
    getRoomParticipants(room: string): ConnectedClient[];
    broadcastToRoom(room: string, event: string, data: any): Promise<void>;
    broadcastToUser(userId: string, event: string, data: any): Promise<void>;
    cleanupInactiveClients(): Promise<void>;
    getServerStats(): {
        connectedClients: number;
        connectedUsers: number;
        rooms: string[];
    };
}
export {};

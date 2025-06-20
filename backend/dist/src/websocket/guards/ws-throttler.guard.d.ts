import { type CanActivate, type ExecutionContext } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
export declare class WsThrottlerGuard implements CanActivate {
    private readonly redisService;
    private readonly logger;
    private readonly ttl;
    private readonly limit;
    constructor(redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}

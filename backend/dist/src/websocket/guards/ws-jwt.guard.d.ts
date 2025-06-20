import { type CanActivate, type ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
export declare class WsJwtGuard implements CanActivate {
    private readonly jwtService;
    private readonly logger;
    constructor(jwtService: JwtService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}

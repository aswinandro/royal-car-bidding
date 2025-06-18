import { type CanActivate, type ExecutionContext, Injectable, Logger } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import { WsException } from "@nestjs/websockets"
import type { Socket } from "socket.io"

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name)

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient()
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(" ")[1]

      if (!token) {
        throw new WsException("Unauthorized")
      }

      const payload = this.jwtService.verify(token)
      client.data.user = payload
      return true
    } catch (error) {
      this.logger.error("WS JWT Guard Error", error)
      throw new WsException("Unauthorized")
    }
  }
}

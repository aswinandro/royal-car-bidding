import { type CanActivate, type ExecutionContext, Injectable, Logger } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import type { Socket } from "socket.io"
import type { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class AuctionRoomGuard implements CanActivate {
  private readonly logger = new Logger(AuctionRoomGuard.name)

  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient()
      const data = context.switchToWs().getData()
      const user = client.data.user

      if (!user) {
        throw new WsException("User not authenticated")
      }

      if (!data.auctionId) {
        throw new WsException("Auction ID required")
      }

      // Check if auction exists and is accessible
      const auction = await this.prismaService.auction.findUnique({
        where: { id: data.auctionId },
      })

      if (!auction) {
        throw new WsException("Auction not found")
      }

      // Check if user can participate in this auction
      if (auction.ownerId === user.sub) {
        // Auction owner cannot bid on their own auction
        if (context.getHandler().name === "handlePlaceBid") {
          throw new WsException("Cannot bid on your own auction")
        }
      }

      // Check auction status for bid placement
      if (context.getHandler().name === "handlePlaceBid") {
        if (auction.status !== "ACTIVE") {
          throw new WsException("Auction is not active")
        }

        // Check if auction has ended
        if (auction.endTime && new Date() > auction.endTime) {
          throw new WsException("Auction has ended")
        }
      }

      return true
    } catch (error) {
      this.logger.error("Auction Room Guard Error", error)
      if (error instanceof WsException) {
        throw error
      }
      throw new WsException("Access denied")
    }
  }
}

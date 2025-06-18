import { io, type Socket } from "socket.io-client"
import { config } from "../config/env"

class WebSocketService {
  private socket: Socket | null = null
  private token: string | null = null

  connect(token?: string) {
    if (token) {
      this.token = token
    }

    if (this.socket?.connected) {
      return this.socket
    }

    console.log(`Connecting to WebSocket at ${config.wsUrl}`)

    this.socket = io(config.wsUrl, {
      auth: {
        token: this.token,
      },
      transports: ["websocket", "polling"],
    })

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server")
    })

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason)
    })

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinAuction(auctionId: string) {
    if (this.socket) {
      this.socket.emit("joinAuction", auctionId)
    }
  }

  leaveAuction(auctionId: string) {
    if (this.socket) {
      this.socket.emit("leaveAuction", auctionId)
    }
  }

  placeBid(auctionId: string, amount: number) {
    if (this.socket) {
      this.socket.emit("placeBid", { auctionId, amount })
    }
  }

  onBidPlaced(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("bidPlaced", callback)
    }
  }

  onAuctionUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("auctionUpdate", callback)
    }
  }

  onAuctionEnded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("auctionEnded", callback)
    }
  }

  offBidPlaced(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("bidPlaced", callback)
    }
  }

  offAuctionUpdate(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("auctionUpdate", callback)
    }
  }

  offAuctionEnded(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("auctionEnded", callback)
    }
  }

  getSocket() {
    return this.socket
  }
}

export const wsService = new WebSocketService()

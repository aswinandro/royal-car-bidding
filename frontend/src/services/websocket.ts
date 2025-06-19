import { io, type Socket } from "socket.io-client"
import { config } from "../config/env"

class WebSocketService {
  private socket: Socket | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(token?: string) {
    if (token) {
      this.token = token
    }

    if (this.socket?.connected) {
      return this.socket
    }

    console.log(`🔌 Connecting to WebSocket at ${config.wsUrl}`)

    this.socket = io(config.wsUrl, {
      auth: {
        token: this.token,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    })

    this.setupEventHandlers()

    return this.socket
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server")
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from WebSocket server:", reason)

      if (reason === "io server disconnect") {
        // Server initiated disconnect, don't reconnect
        return
      }

      this.handleReconnect()
    })

    this.socket.on("connect_error", (error) => {
      console.error("🔥 WebSocket connection error:", error)
      this.handleReconnect()
    })

    this.socket.on("connected", (data) => {
      console.log("🎉 WebSocket authentication successful:", data)
    })

    this.socket.on("error", (error) => {
      console.error("⚠️ WebSocket error:", error)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)

      setTimeout(() => {
        if (this.token) {
          this.connect(this.token)
        }
      }, delay)
    } else {
      console.error("❌ Max reconnection attempts reached")
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.reconnectAttempts = 0
  }

  // Auction room methods
  joinAuction(auctionId: string) {
    if (this.socket) {
      console.log(`🏠 Joining auction room: ${auctionId}`)
      this.socket.emit("joinAuction", { auctionId })
    }
  }

  leaveAuction(auctionId: string) {
    if (this.socket) {
      console.log(`🚪 Leaving auction room: ${auctionId}`)
      this.socket.emit("leaveAuction", { auctionId })
    }
  }

  placeBid(auctionId: string, amount: number) {
    if (this.socket) {
      console.log(`💰 Placing bid: $${amount} on auction ${auctionId}`)
      this.socket.emit("placeBid", { auctionId, amount })
    }
  }

  getAuctionStatus(auctionId: string) {
    if (this.socket) {
      this.socket.emit("getAuctionStatus", { auctionId })
    }
  }

  getRoomParticipants(auctionId: string) {
    if (this.socket) {
      this.socket.emit("getRoomParticipants", { auctionId })
    }
  }

  startAuction(auctionId: string) {
    if (this.socket) {
      this.socket.emit("startAuction", { auctionId })
    }
  }

  endAuction(auctionId: string) {
    if (this.socket) {
      this.socket.emit("endAuction", { auctionId })
    }
  }

  // Event listeners
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

  onAuctionStarted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("auctionStarted", callback)
    }
  }

  onJoinedAuction(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("joinedAuction", callback)
    }
  }

  onLeftAuction(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("leftAuction", callback)
    }
  }

  onBidConfirmed(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("bidConfirmed", callback)
    }
  }

  onBidError(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("bidError", callback)
    }
  }

  onUserJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("userJoined", callback)
    }
  }

  onUserLeft(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("userLeft", callback)
    }
  }

  // Remove event listeners
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

  offAuctionStarted(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("auctionStarted", callback)
    }
  }

  offJoinedAuction(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("joinedAuction", callback)
    }
  }

  offLeftAuction(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("leftAuction", callback)
    }
  }

  offBidConfirmed(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("bidConfirmed", callback)
    }
  }

  offBidError(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("bidError", callback)
    }
  }

  offUserJoined(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("userJoined", callback)
    }
  }

  offUserLeft(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off("userLeft", callback)
    }
  }

  // Utility methods
  getSocket() {
    return this.socket
  }

  isConnected() {
    return this.socket?.connected || false
  }

  getConnectionState() {
    if (!this.socket) return "disconnected"
    return this.socket.connected ? "connected" : "connecting"
  }
}

export const wsService = new WebSocketService()

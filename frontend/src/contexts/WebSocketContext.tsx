"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { wsService } from "../services/websocket"
import { useAuth } from "./AuthContext"

interface WebSocketContextType {
  joinAuction: (auctionId: string) => void
  leaveAuction: (auctionId: string) => void
  placeBid: (auctionId: string, amount: number) => void
  onBidPlaced: (callback: (data: any) => void) => void
  onAuctionUpdate: (callback: (data: any) => void) => void
  onAuctionEnded: (callback: (data: any) => void) => void
  offBidPlaced: (callback?: (data: any) => void) => void
  offAuctionUpdate: (callback?: (data: any) => void) => void
  offAuctionEnded: (callback?: (data: any) => void) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token} = useAuth()

  useEffect(() => {
    if (token) {
      wsService.connect(token)
    } else {
      wsService.disconnect()
    }

    return () => {
      wsService.disconnect()
    }
  }, [token])

  const contextValue: WebSocketContextType = {
    joinAuction: wsService.joinAuction.bind(wsService),
    leaveAuction: wsService.leaveAuction.bind(wsService),
    placeBid: wsService.placeBid.bind(wsService),
    onBidPlaced: wsService.onBidPlaced.bind(wsService),
    onAuctionUpdate: wsService.onAuctionUpdate.bind(wsService),
    onAuctionEnded: wsService.onAuctionEnded.bind(wsService),
    offBidPlaced: wsService.offBidPlaced.bind(wsService),
    offAuctionUpdate: wsService.offAuctionUpdate.bind(wsService),
    offAuctionEnded: wsService.offAuctionEnded.bind(wsService),
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

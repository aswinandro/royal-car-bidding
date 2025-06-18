"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Badge } from "../components/ui/Badge"
import { Separator } from "../components/ui/Separator"
import { apiService } from "../services/api"
import { useWebSocket } from "../contexts/WebSocketContext"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../components/ui/Toast"

export function AuctionPage() {
  const { id } = useParams<{ id: string }>()
  const [auction, setAuction] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [bidAmount, setBidAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [placingBid, setPlacingBid] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const {
    joinAuction,
    leaveAuction,
    onBidPlaced,
    onAuctionUpdate,
    onAuctionEnded,
    offBidPlaced,
    offAuctionUpdate,
    offAuctionEnded,
  } = useWebSocket()

  useEffect(() => {
    if (id) {
      loadAuction()
      loadBids()
      joinAuction(id)

      const handleBidPlaced = (data: any) => {
        if (data.auctionId === id) {
          loadBids()
          loadAuction()
          toast({
            title: "New Bid Placed",
            description: `New bid of $${data.amount} placed!`,
          })
        }
      }

      const handleAuctionUpdate = (data: any) => {
        if (data.auctionId === id) {
          loadAuction()
          toast({
            title: "Auction Updated",
            description: `Auction status: ${data.status}`,
          })
        }
      }

      const handleAuctionEnded = (data: any) => {
        if (data.auctionId === id) {
          loadAuction()
          toast({
            title: "Auction Ended",
            description: `Auction has ended with winning bid of $${data.winningBid}`,
          })
        }
      }

      onBidPlaced(handleBidPlaced)
      onAuctionUpdate(handleAuctionUpdate)
      onAuctionEnded(handleAuctionEnded)

      return () => {
        leaveAuction(id)
        offBidPlaced(handleBidPlaced)
        offAuctionUpdate(handleAuctionUpdate)
        offAuctionEnded(handleAuctionEnded)
      }
    }
  }, [id])

  const loadAuction = async () => {
    try {
      if (!id) return
      const data = await apiService.getAuction(id)
      setAuction(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load auction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBids = async () => {
    try {
      if (!id) return
      const data = await apiService.getAuctionBids(id)
      setBids(data)
    } catch (error) {
      console.error("Failed to load bids:", error)
    }
  }

  const handlePlaceBid = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to place a bid",
        variant: "destructive",
      })
      return
    }

    if (!bidAmount || Number.parseFloat(bidAmount) <= 0) {
      toast({
        title: "Invalid Bid",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      })
      return
    }

    try {
      setPlacingBid(true)
      await apiService.placeBid(id!, Number.parseFloat(bidAmount))
      setBidAmount("")
      toast({
        title: "Bid Placed",
        description: "Your bid has been placed successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Bid Failed",
        description: error.message || "Failed to place bid",
        variant: "destructive",
      })
    } finally {
      setPlacingBid(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "ENDED":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMinBidAmount = () => {
    if (!auction) return 0
    return auction.currentBid ? auction.currentBid + 1 : auction.startingBid
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Auction not found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">
                {auction.car.year} {auction.car.make} {auction.car.model}
              </CardTitle>
              <Badge className={getStatusColor(auction.status)}>{auction.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {auction.car.imageUrl && (
              <img
                src={auction.car.imageUrl || "/placeholder.svg?height=300&width=600"}
                alt={`${auction.car.make} ${auction.car.model}`}
                className="w-full h-64 object-cover rounded-md"
              />
            )}

            <p className="text-gray-600">{auction.car.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Starting Bid:</span>
                <p className="text-lg">{formatCurrency(auction.startingBid)}</p>
              </div>

              {auction.currentBid && (
                <div>
                  <span className="font-medium">Current Bid:</span>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(auction.currentBid)}</p>
                </div>
              )}

              <div>
                <span className="font-medium">Start Time:</span>
                <p>{formatDate(auction.startTime)}</p>
              </div>

              <div>
                <span className="font-medium">End Time:</span>
                <p>{formatDate(auction.endTime)}</p>
              </div>

              <div>
                <span className="font-medium">Owner:</span>
                <p>{auction.owner.username}</p>
              </div>

              {auction.winner && (
                <div>
                  <span className="font-medium">Winner:</span>
                  <p className="font-bold text-green-600">{auction.winner.username}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {auction.status === "ACTIVE" && user && auction.owner.id !== user.id && (
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Minimum bid: {formatCurrency(getMinBidAmount())}</label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    type="number"
                    placeholder="Enter bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={getMinBidAmount()}
                    step="1"
                  />
                  <Button onClick={handlePlaceBid} disabled={placingBid}>
                    {placingBid ? "Placing..." : "Place Bid"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bid History</CardTitle>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No bids yet</p>
            ) : (
              <div className="space-y-3">
                {bids.map((bid, index) => (
                  <div key={bid.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{bid.user.username}</p>
                        <p className="text-sm text-gray-500">{formatDate(bid.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(bid.amount)}</p>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Highest
                          </Badge>
                        )}
                      </div>
                    </div>
                    {index < bids.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

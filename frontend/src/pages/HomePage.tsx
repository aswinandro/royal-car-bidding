"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { apiService } from "../services/api"
import { useToast } from "../components/ui/Toast"

export function HomePage() {
  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ACTIVE")
  const { toast } = useToast()

  useEffect(() => {
    loadAuctions()
  }, [filter])

  const loadAuctions = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAuctions(filter)
      setAuctions(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load auctions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Car Auctions</h1>
        <div className="flex space-x-2">
          {["ACTIVE", "PENDING", "ENDED"].map((status) => (
            <Button key={status} variant={filter === status ? "default" : "outline"} onClick={() => setFilter(status)}>
              {status}
            </Button>
          ))}
        </div>
      </div>

      {auctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No auctions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <Card key={auction.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {auction.car.year} {auction.car.make} {auction.car.model}
                  </CardTitle>
                  <Badge className={getStatusColor(auction.status)}>{auction.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {auction.car.imageUrl && (
                  <img
                    src={auction.car.imageUrl || "/placeholder.svg?height=200&width=400"}
                    alt={`${auction.car.make} ${auction.car.model}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{auction.car.description}</p>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Starting Bid:</span>
                    <span className="text-sm">{formatCurrency(auction.startingBid)}</span>
                  </div>

                  {auction.currentBid && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Current Bid:</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(auction.currentBid)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Ends:</span>
                    <span className="text-sm">{formatDate(auction.endTime)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Bids:</span>
                    <span className="text-sm">{auction._count.bids}</span>
                  </div>
                </div>

                <Link to={`/auction/${auction.id}`}>
                  <Button className="w-full">{auction.status === "ACTIVE" ? "Place Bid" : "View Details"}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { Textarea } from "../components/ui/Textarea"
import { apiService } from "../services/api"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../components/ui/Toast"

export function CreateAuctionPage() {
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    description: "",
    imageUrl: "",
    startTime: "",
    endTime: "",
    startingBid: "",
  })

  const [loading, setLoading] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Fix: define form field keys for TS safety
  type FormField = keyof typeof formData

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as FormField
    const value = e.target.value

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to create an auction",
        variant: "destructive",
      })
      return
    }

    const requiredFields: FormField[] = ["make", "model", "year", "description", "startTime", "endTime", "startingBid"]
    const missingFields = requiredFields.filter((field) => !formData[field])

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const startTime = new Date(formData.startTime)
    const endTime = new Date(formData.endTime)
    const now = new Date()

    if (startTime < now) {
      toast({
        title: "Validation Error",
        description: "Start time must be in the future",
        variant: "destructive",
      })
      return
    }

    if (endTime <= startTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const auctionData = {
        carId: "temp",
        startTime: formData.startTime,
        endTime: formData.endTime,
        startingBid: Number.parseFloat(formData.startingBid),
        make: formData.make,
        model: formData.model,
        year: Number.parseInt(formData.year),
        description: formData.description,
        imageUrl: formData.imageUrl || null,
      }

      const auction = await apiService.createAuction(auctionData)

      toast({
        title: "Success",
        description: "Auction created successfully!",
      })

      navigate(`/auction/${auction.id}`)
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create auction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Please login to create an auction</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Auction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Car Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    name="make"
                    type="text"
                    placeholder="e.g., Toyota"
                    value={formData.make}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    name="model"
                    type="text"
                    placeholder="e.g., Camry"
                    value={formData.model}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    placeholder="e.g., 2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startingBid">Starting Bid ($) *</Label>
                  <Input
                    id="startingBid"
                    name="startingBid"
                    type="number"
                    placeholder="e.g., 5000"
                    min="1"
                    step="1"
                    value={formData.startingBid}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the car's condition, features, history, etc."
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  placeholder="https://example.com/car-image.jpg"
                  value={formData.imageUrl}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Auction Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={handleChange}
                    min={formData.startTime || new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Auction..." : "Create Auction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

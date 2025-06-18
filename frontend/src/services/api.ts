import { config } from "../config/env"

class ApiService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = config.apiUrl
    this.token = localStorage.getItem("token")
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem("token", token)
  }

  removeToken() {
    this.token = null
    localStorage.removeItem("token")
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, username: string, password: string) {
    return this.request<{ access_token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    })
  }

  // Auction endpoints
  async getAuctions(status?: string) {
    const query = status ? `?status=${status}` : ""
    return this.request<any[]>(`/auctions${query}`)
  }

  async getAuction(id: string) {
    return this.request<any>(`/auctions/${id}`)
  }

  async createAuction(data: any) {
    return this.request<any>("/auctions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Bid endpoints
  async placeBid(auctionId: string, amount: number) {
    return this.request<any>("/bids", {
      method: "POST",
      body: JSON.stringify({ auctionId, amount }),
    })
  }

  async getAuctionBids(auctionId: string) {
    return this.request<any[]>(`/bids/auction/${auctionId}`)
  }

  async getHighestBid(auctionId: string) {
    return this.request<any>(`/bids/auction/${auctionId}/highest`)
  }
}

export const apiService = new ApiService()

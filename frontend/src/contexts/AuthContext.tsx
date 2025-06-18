"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiService } from "../services/api"

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on app start
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      apiService.setToken(savedToken)
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password)
      setToken(response.access_token)
      setUser(response.user)

      localStorage.setItem("token", response.access_token)
      localStorage.setItem("user", JSON.stringify(response.user))

      apiService.setToken(response.access_token)
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await apiService.register(email, username, password)
      setToken(response.access_token)
      setUser(response.user)

      localStorage.setItem("token", response.access_token)
      localStorage.setItem("user", JSON.stringify(response.user))

      apiService.setToken(response.access_token)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    apiService.removeToken()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

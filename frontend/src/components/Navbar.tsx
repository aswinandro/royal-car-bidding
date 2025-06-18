"use client"

import { Link, useNavigate } from "react-router-dom"
import { Button } from "./ui/Button"
import { useAuth } from "../contexts/AuthContext"
import { config } from "../config/env"

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            {config.appName}
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-700">Welcome, {user.username}</span>
                <Link to="/create-auction">
                  <Button variant="outline">Create Auction</Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

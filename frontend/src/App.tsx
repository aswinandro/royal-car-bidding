import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "./components/ui/Toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { WebSocketProvider } from "./contexts/WebSocketContext"
import { Navbar } from "./components/Navbar"
import { HomePage } from "./pages/HomePage"
import { AuctionPage } from "./pages/AuctionPage"
import { LoginPage } from "./pages/LoginPage"
import { RegisterPage } from "./pages/RegisterPage"
import { CreateAuctionPage } from "./pages/CreateAuctionPage"
import { config } from "./config/env"

function App() {
  return (
    <Toaster>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auction/:id" element={<AuctionPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/create-auction" element={<CreateAuctionPage />} />
                </Routes>
              </main>

              {/* Development info */}
              {config.isDevelopment && (
                <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded opacity-50">
                  <div>API: {config.apiUrl}</div>
                  <div>WS: {config.wsUrl}</div>
                  <div>Mode: {config.mode}</div>
                  <div>Version: {config.appVersion}</div>
                </div>
              )}
            </div>
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </Toaster>
  )
}

export default App

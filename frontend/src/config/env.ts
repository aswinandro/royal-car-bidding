/// <reference types="vite/client" />

// Environment configuration with fallbacks and validation
export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3001",
  wsUrl: import.meta.env.VITE_WS_URL || "http://localhost:3001",

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || "Car Auction System",
  appVersion: import.meta.env.VITE_APP_VERSION || "1.0.0",

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  nodeEnv: import.meta.env.VITE_NODE_ENV || "development",
  mode: import.meta.env.MODE || "development",

  // Port (for development reference)
  devPort: Number(import.meta.env.VITE_DEV_PORT) || 5173,
} as const

// Validate required environment variables
const requiredEnvVars = ["VITE_API_URL", "VITE_WS_URL"] as const

export function validateEnv() {
  const missing = requiredEnvVars.filter((envVar) => !import.meta.env[envVar] && !getDefaultValue(envVar))

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(", ")}. Using defaults.`)
  }

  // Log configuration in development
  if (config.isDevelopment) {
    console.log("🔧 Environment Configuration:", {
      apiUrl: config.apiUrl,
      wsUrl: config.wsUrl,
      appName: config.appName,
      nodeEnv: config.nodeEnv,
      mode: config.mode,
    })
  }
}

function getDefaultValue(envVar: string): string | undefined {
  const defaults: Record<string, string> = {
    VITE_API_URL: "http://localhost:3001",
    VITE_WS_URL: "http://localhost:3001",
  }
  return defaults[envVar]
}

// Type-safe environment variable getter
export function getEnvVar(key: string, fallback?: string): string {
  return import.meta.env[key] || fallback || ""
}

// Call validation on module load
validateEnv()

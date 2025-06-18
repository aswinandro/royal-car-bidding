import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT) || 5173,
    host: true,
    strictPort: true,
  },
  preview: {
    port: Number(process.env.VITE_DEV_PORT) || 5173,
    host: true,
    strictPort: true,
  },
  css: {
    postcss: "./postcss.config.mjs",
  },
})

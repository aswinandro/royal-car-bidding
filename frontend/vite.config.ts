import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      host: true,
      strictPort: true,
      cors: true,
    },
    preview: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      host: true,
      strictPort: true,
    },
    css: {
      postcss: "./postcss.config.mjs",
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            socket: ["socket.io-client"],
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || "1.0.0"),
    },
    // Ensure environment variables are available
    envPrefix: ["VITE_"],
  }
})

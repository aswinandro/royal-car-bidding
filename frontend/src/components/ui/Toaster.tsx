import type React from "react"
import { ToastProvider } from "./Toast"

export function Toaster({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

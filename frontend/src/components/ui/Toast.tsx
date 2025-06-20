"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { clsx } from "clsx"
import { X } from "lucide-react"

// Export types to use in your hook or elsewhere
export interface ToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  action?: React.ReactNode
}

export type ToastActionElement = React.ReactNode

export interface Toast extends ToastProps {
  id: string
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id, open: true }])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  )
}

function ToastViewport() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all animate-in slide-in-from-top-full sm:slide-in-from-bottom-full",
            toast.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-gray-200 bg-white text-gray-900",
          )}
          // Optional: you can handle open state animation here if needed
          style={{ display: toast.open === false ? "none" : undefined }}
        >
          <div className="grid gap-1">
            {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
            {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
            {toast.action && <div>{toast.action}</div>}
          </div>
          <button
            onClick={() => {
              toast.onOpenChange?.(false)
              dismiss(toast.id)
            }}
            className="absolute right-2 top-2 rounded-lg p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 group-hover:opacity-100"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

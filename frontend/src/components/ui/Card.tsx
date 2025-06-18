import type React from "react"
import { clsx } from "clsx"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={clsx("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>{children}</div>
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={clsx("px-6 py-4 border-b border-gray-200", className)}>{children}</div>
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h3 className={clsx("text-lg font-semibold text-gray-900", className)}>{children}</h3>
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx("px-6 py-4", className)}>{children}</div>
}

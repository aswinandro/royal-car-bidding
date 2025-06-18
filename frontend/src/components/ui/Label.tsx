import type React from "react"
import { clsx } from "clsx"

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  className?: string
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={clsx("text-sm font-medium text-gray-700", className)} {...props}>
      {children}
    </label>
  )
}

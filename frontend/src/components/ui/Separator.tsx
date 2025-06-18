import { clsx } from "clsx"

interface SeparatorProps {
  className?: string
  orientation?: "horizontal" | "vertical"
}

export function Separator({ className, orientation = "horizontal" }: SeparatorProps) {
  return (
    <div
      className={clsx(orientation === "horizontal" ? "h-px w-full bg-gray-200" : "w-px h-full bg-gray-200", className)}
    />
  )
}

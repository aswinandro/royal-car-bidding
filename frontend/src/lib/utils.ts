import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Theme function to access CSS custom properties
export function theme(path: string) {
  return `var(--${path.replace(/\./g, "-")})`
}

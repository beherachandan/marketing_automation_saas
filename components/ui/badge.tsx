import * as React from "react"
import { cn } from "@/lib/cn"

type BadgeVariant = "default" | "secondary" | "success" | "destructive" | "outline" | "warning"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-success/10 text-success border-transparent",
  destructive: "bg-destructive/10 text-destructive border-transparent",
  outline: "border-border text-foreground bg-transparent",
  warning: "bg-yellow-500/10 text-yellow-700 border-transparent",
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

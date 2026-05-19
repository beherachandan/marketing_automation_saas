import * as React from "react"
import { cn } from "@/lib/cn"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-y",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean
  optional?: boolean
  hint?: string
  marker?: "auto" | "edited" | null
}

export function Label({ className, required, optional, hint, marker, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-xxs uppercase tracking-wide font-medium text-muted-foreground mb-1.5",
        className,
      )}
      {...props}
    >
      <span className="flex-none">{children}</span>
      {required && (
        <span className="text-muted-foreground/60 normal-case tracking-normal font-normal text-[10px]">*</span>
      )}
      {optional && (
        <span className="text-muted-foreground/40 normal-case tracking-normal font-normal text-[10px]">(optional)</span>
      )}
      {marker === "auto" && (
        <span className="inline-flex items-center rounded-sm bg-muted/60 text-muted-foreground px-1 py-px text-[9px] font-mono normal-case tracking-normal">
          ◇ auto
        </span>
      )}
      {marker === "edited" && (
        <span className="inline-flex items-center rounded-sm bg-primary/10 text-primary px-1 py-px text-[9px] font-mono normal-case tracking-normal">
          ● edited
        </span>
      )}
      {hint && (
        <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground/80 truncate">
          {hint}
        </span>
      )}
    </label>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[12px] text-destructive mt-1">{message}</p>
}

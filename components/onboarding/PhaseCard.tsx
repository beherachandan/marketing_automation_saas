"use client"

import { cn } from "@/lib/cn"

export interface PhaseCardProps {
  phase: number
  agentId: string
  agentLabel: string
  title: string
  description: string
  capability: string
  icon: React.ReactNode
  /** Whether this card is in the highlighted/active state */
  active?: boolean
}

const PHASE_COLORS: Record<number, { border: string; badge: string; icon: string; ring: string }> = {
  1: { border: "border-violet-200", badge: "bg-violet-50 text-violet-600", icon: "bg-violet-100", ring: "ring-violet-200" },
  2: { border: "border-blue-200",   badge: "bg-blue-50 text-blue-600",     icon: "bg-blue-100",   ring: "ring-blue-200"   },
  3: { border: "border-sky-200",    badge: "bg-sky-50 text-sky-600",       icon: "bg-sky-100",    ring: "ring-sky-200"    },
  4: { border: "border-pink-200",   badge: "bg-pink-50 text-pink-600",     icon: "bg-pink-100",   ring: "ring-pink-200"   },
  5: { border: "border-amber-200",  badge: "bg-amber-50 text-amber-700",   icon: "bg-amber-100",  ring: "ring-amber-200"  },
  6: { border: "border-green-200",  badge: "bg-green-50 text-green-700",   icon: "bg-green-100",  ring: "ring-green-200"  },
  7: { border: "border-orange-200", badge: "bg-orange-50 text-orange-700", icon: "bg-orange-100", ring: "ring-orange-200" },
}

export function PhaseCard({
  phase,
  agentId,
  agentLabel,
  title,
  description,
  capability,
  icon,
  active = false,
}: PhaseCardProps) {
  const c = PHASE_COLORS[phase] ?? PHASE_COLORS[1]

  return (
    <div
      className={cn(
        "group relative flex gap-3.5 p-4 rounded-lg border bg-white transition-all duration-200",
        c.border,
        active && cn("shadow-sm ring-1", c.ring),
        !active && "hover:shadow-sm hover:ring-1 hover:" + c.ring,
      )}
    >
      {/* Phase icon */}
      <div className={cn("h-9 w-9 shrink-0 rounded-md flex items-center justify-center [&>svg]:h-5 [&>svg]:w-5", c.icon)}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[13px] font-semibold text-foreground leading-snug">{title}</p>
          <span className={cn("shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5", c.badge)}>
            {agentId}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{description}</p>
        {/* Capability reveal — what this agent unlocks */}
        <p className="text-[11px] text-foreground/60 border-t border-border pt-2 leading-snug">
          <span className="font-medium text-foreground/70">After this: </span>
          {capability}
        </p>
      </div>

      {/* Agent label — bottom-right */}
      <div className="absolute bottom-3 right-3">
        <span className="text-[9px] text-muted-foreground/40 font-mono">{agentLabel}</span>
      </div>
    </div>
  )
}

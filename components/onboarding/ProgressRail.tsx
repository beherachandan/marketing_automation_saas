"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/cn"

const steps = [
  { n: 1, label: "Workspace",   icon: "🏢" },
  { n: 2, label: "Product",     icon: "📦" },
  { n: 3, label: "ICPs",        icon: "👥" },
  { n: 4, label: "Brand voice", icon: "🎨" },
  { n: 5, label: "Strategy",    icon: "🎯" },
  { n: 6, label: "Seeds",       icon: "🌱" },
  { n: 7, label: "Integrations",icon: "🔌" },
  { n: 8, label: "Launch",      icon: "🚀" },
] as const

export function ProgressRail({ completedSteps }: { completedSteps: number[] }) {
  const pathname = usePathname()
  const current = Number(pathname?.match(/step-(\d+)/)?.[1] ?? 0)
  const isZeroScreen = pathname === "/onboarding"
  const maxCompleted = completedSteps.length ? Math.max(...completedSteps) : 0
  const done = completedSteps.filter((n) => n >= 1 && n <= 8).length
  const pct = Math.round((done / 8) * 100)

  return (
    <aside className="w-[180px] shrink-0 border-r border-border bg-background h-full flex flex-col overflow-hidden">
      {/* wordmark */}
      <div className="px-5 pt-5 pb-3">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">Conduct</span>
      </div>

      {/* steps list */}
      <ol className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {/* zero screen */}
        <li>
          <Link
            href="/onboarding"
            className={cn(
              "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors",
              isZeroScreen
                ? "border-l-2 border-primary pl-[10px] font-semibold text-foreground rounded-l-none"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
            )}
          >
            <span className={cn(
              "h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px]",
              isZeroScreen ? "border-primary text-primary" : "border-border text-muted-foreground",
            )}>
              ✦
            </span>
            Start
          </Link>
        </li>

        {steps.map((s) => {
          const isDone = completedSteps.includes(s.n)
          const isActive = s.n === current
          const reachable = isDone || isActive || s.n <= maxCompleted + 1

          const row = (
            <div className={cn(
              "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors",
              isActive
                ? "border-l-2 border-primary pl-[10px] font-semibold text-foreground rounded-l-none"
                : isDone
                  ? "text-foreground/60 hover:text-foreground hover:bg-surface-2"
                  : reachable
                    ? "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    : "text-muted-foreground/40 cursor-not-allowed",
            )}>
              {/* dot */}
              <span className={cn(
                "h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] transition-all",
                isDone
                  ? "bg-zinc-400 border-zinc-400 text-white"
                  : isActive
                    ? "border-primary text-primary bg-background"
                    : "border-border text-muted-foreground/50 bg-background",
              )}>
                {isDone ? (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="text-[9px]">{s.n}</span>
                )}
              </span>
              {s.label}
            </div>
          )

          return (
            <li key={s.n}>
              {reachable ? (
                <Link href={`/onboarding/step-${s.n}` as never}>{row}</Link>
              ) : row}
            </li>
          )
        })}
      </ol>

      {/* progress bar — 1px, bottom */}
      <div className="px-5 pb-5 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">{done}/8 steps</span>
          <span className="text-[11px] font-medium text-foreground">{pct}%</span>
        </div>
        <div className="h-px w-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </aside>
  )
}

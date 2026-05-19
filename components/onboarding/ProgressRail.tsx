"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/cn"

const steps = [
  { n: 1, label: "Workspace", icon: "🏢" },
  { n: 2, label: "Product", icon: "📦" },
  { n: 3, label: "ICPs", icon: "👥" },
  { n: 4, label: "Brand voice", icon: "🎨" },
  { n: 5, label: "Strategy", icon: "🎯" },
  { n: 6, label: "Seeds", icon: "🌱" },
  { n: 7, label: "Integrations", icon: "🔌" },
  { n: 8, label: "Launch", icon: "🚀" },
] as const

const milestones = [
  { after: 0, label: "Identity" },
  { after: 2, label: "Configure" },
  { after: 6, label: "Launch" },
]

export function ProgressRail({ completedSteps }: { completedSteps: number[] }) {
  const pathname = usePathname()
  const current = Number(pathname?.match(/step-(\d+)/)?.[1] ?? 0)
  const isZeroScreen = pathname === "/onboarding"
  const maxCompleted = completedSteps.length ? Math.max(...completedSteps) : 0
  const done = completedSteps.filter((n) => n >= 1 && n <= 8).length
  const pct = Math.round((done / 8) * 100)

  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-card/60 h-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/70">
            Setup
          </span>
          <span className="ml-auto text-[11px] font-mono text-muted-foreground/50">{pct}%</span>
        </div>
        {/* 1px progress track — very subtle */}
        <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full bg-zinc-400 dark:bg-zinc-500 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/50">
          {done === 8 ? "Ready to launch" : `${8 - done} step${8 - done === 1 ? "" : "s"} remaining`}
        </p>
      </div>

      {/* steps list */}
      <ol className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Zero screen — always reachable */}
        <li>
          <Link
            href="/onboarding"
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all",
              isZeroScreen && "border-l-2 border-zinc-400 dark:border-zinc-500 pl-[6px] bg-transparent",
              !isZeroScreen && "hover:bg-secondary/40",
            )}
          >
            <span className={cn(
              "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] transition-all",
              isZeroScreen
                ? "bg-background border border-zinc-400 dark:border-zinc-500"
                : "bg-background border border-zinc-200 dark:border-zinc-700",
            )}>
              ✦
            </span>
            <span className={cn(
              "text-[13px] leading-tight",
              isZeroScreen && "font-semibold text-foreground",
              !isZeroScreen && "text-foreground/50",
            )}>
              Start
            </span>
          </Link>
          <div className="ml-[18px] w-px h-2 bg-zinc-100 dark:bg-zinc-800" />
        </li>
        {steps.map((s, i) => {
          const isDone = completedSteps.includes(s.n)
          const isActive = s.n === current
          const reachable = isDone || isActive || s.n <= maxCompleted + 1
          const milestone = milestones.find((m) => m.after === i)

          return (
            <li key={s.n}>
              {milestone && (
                <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-2 pt-3 pb-1">
                  {milestone.label}
                </p>
              )}
              {reachable ? (
                <Link
                  href={`/onboarding/step-${s.n}` as never}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all",
                    isActive && "border-l-2 border-zinc-400 dark:border-zinc-500 pl-[6px] bg-transparent",
                    !isActive && "hover:bg-secondary/40",
                  )}
                >
                  <StepDot isDone={isDone} isActive={isActive} icon={s.icon} />
                  <span
                    className={cn(
                      "text-[13px] leading-tight",
                      isActive && "font-semibold text-foreground",
                      isDone && !isActive && "text-foreground/70",
                      !isActive && !isDone && "text-foreground/50",
                    )}
                  >
                    {s.label}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 px-2 py-1.5 cursor-not-allowed opacity-30">
                  <StepDot isDone={false} isActive={false} icon={s.icon} />
                  <span className="text-[13px] text-foreground/40">{s.label}</span>
                </div>
              )}

              {/* connector — barely visible */}
              {i < steps.length - 1 && (
                <div className="ml-[18px] w-px h-2 bg-zinc-100 dark:bg-zinc-800" />
              )}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

function StepDot({
  isDone,
  isActive,
  icon,
}: {
  isDone: boolean
  isActive: boolean
  icon: string
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] transition-all",
        isDone && "bg-zinc-400 dark:bg-zinc-500 text-white border border-zinc-400 dark:border-zinc-500",
        isActive && !isDone && "bg-background border border-zinc-400 dark:border-zinc-500",
        !isDone && !isActive && "bg-background border border-zinc-200 dark:border-zinc-700",
      )}
    >
      {isDone ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        icon
      )}
    </span>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/cn"

const steps = [
  { n: 1, label: "Workspace", blurb: "Agent + user identity" },
  { n: 2, label: "Product", blurb: "What you sell" },
  { n: 3, label: "ICPs", blurb: "Who you sell to" },
  { n: 4, label: "Brand voice", blurb: "Tone + hard rules" },
  { n: 5, label: "Content strategy", blurb: "Guidelines + rubric" },
  { n: 6, label: "Demand seeds", blurb: "Topics to mine" },
  { n: 7, label: "Integrations", blurb: "Slack · CMS · APIs" },
  { n: 8, label: "Launch", blurb: "Crons + host" },
] as const

export function SideStepper({ completedSteps }: { completedSteps: number[] }) {
  const pathname = usePathname()
  const current = Number(pathname?.match(/step-(\d+)/)?.[1] ?? 1)
  const maxCompleted = completedSteps.length ? Math.max(...completedSteps) : 0
  const total = steps.length
  const done = completedSteps.filter((n) => n >= 1 && n <= total).length
  const pct = Math.round((done / total) * 100)

  return (
    <aside className="border-r border-border bg-card/60 h-full flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <p className="label-uppercase">Onboarding</p>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {done}
            <span className="text-muted-foreground">/{total}</span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="flex-1 overflow-y-auto px-3 pb-6">
        {steps.map((s, i) => {
          const isDone = completedSteps.includes(s.n)
          const isActive = s.n === current
          const reachable = isDone || isActive || s.n <= maxCompleted + 1
          const nextIsDone = completedSteps.includes(s.n + 1) || completedSteps.includes(s.n)
          const connector = i < steps.length - 1

          const circle = (
            <span
              className={cn(
                "relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono transition-colors",
                isActive && !isDone && "bg-background border-primary ring-2 ring-primary/25 text-primary",
                isDone && "bg-success text-success-foreground border-success",
                !isActive && !isDone && reachable && "bg-background border-zinc-300 text-muted-foreground",
                !reachable && "bg-zinc-50 border-zinc-200 text-zinc-300",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? "✓" : s.n}
            </span>
          )

          const inner = (
            <>
              <div className="relative flex flex-col items-center">
                {circle}
                {connector && (
                  <span
                    aria-hidden
                    className={cn(
                      "w-px flex-1 mt-1 mb-1",
                      nextIsDone ? "bg-success" : "bg-border",
                    )}
                    style={{ minHeight: 18 }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <p
                  className={cn(
                    "text-[13px] leading-tight truncate",
                    isActive && "font-semibold text-foreground",
                    isDone && !isActive && "text-foreground",
                    !isActive && !isDone && reachable && "text-foreground/80",
                    !reachable && "text-zinc-400",
                  )}
                >
                  {s.label}
                </p>
                <p
                  className={cn(
                    "text-[11px] leading-tight mt-0.5 truncate",
                    !reachable ? "text-zinc-300" : "text-muted-foreground",
                  )}
                >
                  {s.blurb}
                </p>
              </div>
            </>
          )

          return (
            <li key={s.n}>
              {reachable ? (
                <Link
                  href={`/onboarding/step-${s.n}` as never}
                  className={cn(
                    "flex items-start gap-3 px-2 py-1 rounded-md transition-colors",
                    "hover:bg-secondary/60",
                    isActive && "bg-secondary/50",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  className="flex items-start gap-3 px-2 py-1 cursor-not-allowed"
                  title="Complete the previous step to unlock"
                >
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="border-t border-border px-5 py-3">
        <p className="text-[10px] font-mono text-muted-foreground">
          {done === total ? "Ready to launch." : `${total - done} step${total - done === 1 ? "" : "s"} left`}
        </p>
      </div>
    </aside>
  )
}

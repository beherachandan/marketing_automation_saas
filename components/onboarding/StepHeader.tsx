import { cn } from "@/lib/cn"

const STEP_META: Record<
  string,
  { icon: string; color: string; milestone: string }
> = {
  "1":         { icon: "🏢", color: "bg-violet-500/10 text-violet-600", milestone: "Identity" },
  "1-discover":{ icon: "🔭", color: "bg-sky-500/10 text-sky-600",       milestone: "Identity" },
  "2":         { icon: "📦", color: "bg-blue-500/10 text-blue-600",      milestone: "Identity" },
  "3":         { icon: "👥", color: "bg-indigo-500/10 text-indigo-600",  milestone: "Configure" },
  "4":         { icon: "🎨", color: "bg-pink-500/10 text-pink-600",      milestone: "Configure" },
  "5":         { icon: "🎯", color: "bg-orange-500/10 text-orange-600",  milestone: "Configure" },
  "6":         { icon: "🌱", color: "bg-green-500/10 text-green-600",    milestone: "Configure" },
  "7":         { icon: "🔌", color: "bg-teal-500/10 text-teal-600",      milestone: "Launch" },
  "8":         { icon: "🚀", color: "bg-brand-100 text-brand-600",       milestone: "Launch" },
}

export function StepHeader({
  step,
  title,
  description,
  badge,
}: {
  step: string        // "1", "1-discover", "2"…"8"
  title: string
  description: string
  badge?: React.ReactNode
}) {
  const meta = STEP_META[step] ?? { icon: "✦", color: "bg-secondary text-foreground", milestone: "" }
  const stepLabel = step === "1-discover" ? "Step 1 · Discover" : `Step ${step} of 8`

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl", meta.color)}>
          {meta.icon}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="label-uppercase">{stepLabel}</span>
          {meta.milestone && (
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              {meta.milestone} phase
            </span>
          )}
        </div>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground text-[14px] leading-relaxed">{description}</p>
      {badge && <div className="mt-4">{badge}</div>}
    </div>
  )
}

export function AutoFillBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-[12px]">
      <span className="shrink-0 mt-0.5 text-brand-500">✦</span>
      <div className="text-foreground/80">{children}</div>
    </div>
  )
}

import { loadOnboardingState } from "@/lib/persist"
import { Step8Form } from "./form"

export const dynamic = "force-dynamic"

export default async function Step8Page() {
  const state = await loadOnboardingState()
  const agentName = state.step1?.agent?.name ?? "your agent"
  const workspace = state.step1?.workspace ?? "your workspace"
  const completedCount = state.completedSteps?.filter((n) => n >= 1 && n <= 7).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Teaching moment — what they've built */}
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/40 mb-3">
          Calibrating your agents
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground mb-1.5">
          Your team is ready to launch
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          {completedCount >= 7
            ? `${agentName} has been calibrated across all 7 phases. One click activates the full pipeline for ${workspace}.`
            : `Complete the remaining steps to fully calibrate ${agentName} before launch.`}
        </p>

        {/* Agent capabilities summary */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "A1 · SERP Scout",        action: "Weekly gap analysis" },
            { label: "B3 · Brief Generator",   action: "Topic → brief in minutes" },
            { label: "C3 · Long-form Writer",  action: "Drafts in your voice" },
            { label: "D1 · GEO Scorer",        action: "Gates every draft ≥7.0" },
            { label: "D4 · Brand Fit",         action: "Rejects brand violations" },
            { label: "O1 · Pipeline Manager",  action: "Slack approvals daily" },
          ].map((a) => (
            <div key={a.label} className="flex gap-2 items-start">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-foreground/70">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slack onboarding note */}
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3.5">
        <p className="text-[12px] font-semibold text-violet-700 mb-1">After launch, start in Slack</p>
        <p className="text-[12px] text-violet-600/80 leading-relaxed">
          Run <code className="font-mono bg-violet-100 px-1 rounded">/audit</code> to see your first gap analysis,
          or <code className="font-mono bg-violet-100 px-1 rounded">/draft [topic]</code> to generate your first
          article. Every approval teaches your agents your preferences.
        </p>
      </div>

      {/* The actual launch form */}
      <Step8Form initial={state.step8} state={state} />
    </div>
  )
}

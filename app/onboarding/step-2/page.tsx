import { loadOnboardingState } from "@/lib/persist"
import { buildStep2Defaults, selectedProductLines } from "@/lib/onboarding-defaults"
import { Step2Form } from "./form"
import { StepHeader, AutoFillBanner } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step2Page() {
  const state = await loadOnboardingState()
  const suggested = buildStep2Defaults(state.scannedHints)
  const initial = state.step2 ?? suggested ?? undefined
  const lines = selectedProductLines(state.scannedHints)
  const hasAutoFill = !state.step2 && !!suggested
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="2"
        title="Product context"
        description="The engine writes every draft from this context. Be as specific as possible — vague product descriptions produce generic content."
        badge={
          hasAutoFill && lines.length > 0 ? (
            <AutoFillBanner>
              <span className="font-medium">Pre-filled from {lines.length} product line{lines.length === 1 ? "" : "s"}:</span>{" "}
              {lines.map((l) => l.name).join(" · ")} — fields marked <span className="font-mono">◇ auto</span> are drafts; edit anything to lock it.
            </AutoFillBanner>
          ) : undefined
        }
      />
      <Step2Form initial={initial} suggested={suggested ?? undefined} hasAutoFill={hasAutoFill} />
    </div>
  )
}

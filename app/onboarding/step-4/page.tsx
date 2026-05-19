import { loadOnboardingState } from "@/lib/persist"
import { buildStep4Defaults } from "@/lib/onboarding-defaults"
import { Step4Form } from "./form"
import { StepHeader, AutoFillBanner } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step4Page() {
  const state = await loadOnboardingState()
  const suggested = buildStep4Defaults(state.scannedHints)
  const initial = state.step4 ?? suggested ?? undefined
  const hasAutoFill = !state.step4 && !!suggested
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="4"
        title="Brand voice"
        description="Every draft enforces these rules, no exceptions. Forbidden words never appear. Tone axes shape the writing style across all content."
        badge={
          hasAutoFill ? (
            <AutoFillBanner>
              <span className="font-medium">Voice preset inferred from your site.</span>{" "}
              Tune sliders by reading a few of your best-written pages — then lock in your hard rules.
            </AutoFillBanner>
          ) : undefined
        }
      />
      <Step4Form initial={initial} hasAutoFill={hasAutoFill} />
    </div>
  )
}

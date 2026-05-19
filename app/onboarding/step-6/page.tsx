import { loadOnboardingState } from "@/lib/persist"
import { buildStep6Defaults } from "@/lib/onboarding-defaults"
import { Step6Form } from "./form"
import { StepHeader, AutoFillBanner } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step6Page() {
  const state = await loadOnboardingState()
  const suggested = buildStep6Defaults(state.scannedHints)
  const initial = state.step6 ?? suggested ?? undefined
  const hasAutoFill = !state.step6 && !!suggested
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="6"
        title="Demand seeds"
        description="5–50 topics that seed your weekly keyword discovery job. Think: exact queries your ICP would type into Google or an AI assistant."
        badge={
          hasAutoFill && suggested ? (
            <AutoFillBanner>
              <span className="font-medium">{suggested.seeds.length} phrases seeded from your site.</span>{" "}
              These are rough — add, remove, or swap in the exact queries your ICP types.
            </AutoFillBanner>
          ) : undefined
        }
      />
      <Step6Form initial={initial} />
    </div>
  )
}

import { loadOnboardingState } from "@/lib/persist"
import { buildStep3Defaults } from "@/lib/onboarding-defaults"
import { Step3Form } from "./form"
import { StepHeader, AutoFillBanner } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step3Page() {
  const state = await loadOnboardingState()
  const suggested = buildStep3Defaults(state.scannedHints)
  const initial = state.step3 ?? suggested ?? undefined
  const hasAutoFill = !state.step3 && !!suggested
  return (
    <div className="px-10 py-8 max-w-3xl">
      <StepHeader
        step="3"
        title="Ideal Customer Profiles"
        description="The first ICP is the primary persona — /draft writes directly to them. Define their pains and goals with specificity; generic ICPs produce generic content."
        badge={
          hasAutoFill && suggested ? (
            <AutoFillBanner>
              <span className="font-medium">{suggested.icps.length} ICP{suggested.icps.length === 1 ? "" : "s"} drafted from scan.</span>{" "}
              Pains, goals, and JTBD are starter drafts — sharpen them so the agent knows exactly who it&apos;s talking to.
            </AutoFillBanner>
          ) : undefined
        }
      />
      <Step3Form initial={initial} hasAutoFill={hasAutoFill} />
    </div>
  )
}

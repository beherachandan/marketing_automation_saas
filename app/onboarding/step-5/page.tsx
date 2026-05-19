import { loadOnboardingState } from "@/lib/persist"
import { Step5Form } from "./form"
import { StepHeader } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step5Page() {
  const state = await loadOnboardingState()
  return (
    <div className="px-10 py-8 max-w-3xl">
      <StepHeader
        step="5"
        title="Content strategy & rubric"
        description="The evaluator scores every audit against these 9 dimensions. Weights must sum to 100 — higher weight means the engine treats that dimension as more important."
      />
      <Step5Form initial={state.step5} />
    </div>
  )
}

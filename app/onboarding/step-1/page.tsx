import { loadOnboardingState } from "@/lib/persist"
import { Step1Form } from "./form"
import { StepHeader } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step1Page() {
  const state = await loadOnboardingState()
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="1"
        title="Agent identity"
        description="Name your agent, set its role, and confirm which work streams it operates in. Your user details are how it signs off on reports."
      />
      <Step1Form initial={state.step1} />
    </div>
  )
}

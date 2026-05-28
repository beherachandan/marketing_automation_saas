import { loadOnboardingState } from "@/lib/persist"
import { Step1Form } from "./form"
import { StepHeader } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step1Page() {
  const state = await loadOnboardingState()
  return (
    <>
      <StepHeader
        step="1"
        title="Name your agent"
        description="Pick a name your team will recognise — it signs off on Slack messages, reports, and generated files."
      />
      <Step1Form initial={state.step1} />
    </>
  )
}

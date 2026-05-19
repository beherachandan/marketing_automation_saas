import { loadOnboardingState } from "@/lib/persist"
import { Step8Form } from "./form"
import { StepHeader } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step8Page() {
  const state = await loadOnboardingState()
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="8"
        title="Launch"
        description="Pick a host, enable cron schedules, verify pre-flight checks — then ignite the engine. Your agent will be live and responding to Slack commands within seconds."
      />
      <Step8Form initial={state.step8} state={state} />
    </div>
  )
}

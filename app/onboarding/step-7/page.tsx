import { loadOnboardingState } from "@/lib/persist"
import { isDevBypass } from "@/lib/persist-local"
import { Step7Form } from "./form"
import { StepHeader } from "@/components/onboarding/StepHeader"

export const dynamic = "force-dynamic"

export default async function Step7Page({ searchParams }: { searchParams: Promise<{ slack?: string }> }) {
  const state = await loadOnboardingState()
  const { slack } = await searchParams
  const devBypass = isDevBypass()
  return (
    <div className="px-10 py-8 max-w-2xl">
      <StepHeader
        step="7"
        title="Integrations"
        description="Slack is required — it's how you interact with the engine. Everything else (keyword APIs, CMS) can run on demo data until you're ready to go live."
      />
      {slack === "ok" && (
        <p className="mb-4 text-[13px] text-success bg-success/10 px-3 py-2 rounded-md">
          ✓ Slack installed. Reload and continue.
        </p>
      )}
      {slack === "error" && (
        <p className="mb-4 text-[13px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          Slack install failed. Try again.
        </p>
      )}
      <Step7Form initial={state.step7} devBypass={devBypass} />
    </div>
  )
}

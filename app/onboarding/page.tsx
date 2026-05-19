import { loadOnboardingState } from "@/lib/persist"
import { SetupForm } from "./setup-form"

export const dynamic = "force-dynamic"

export default async function OnboardingZeroPage() {
  const state = await loadOnboardingState()
  return (
    <div className="px-10 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl bg-violet-500/10 text-violet-600">
            ✦
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="label-uppercase">Get started</span>
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              Setup
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Set up your workspace</h1>
        <p className="text-muted-foreground text-[14px] leading-relaxed">
          Enter your website and we&apos;ll scan it to pre-fill the next 5 steps. Pick your work streams to see the skills your agent will master.
        </p>
      </div>
      <SetupForm
        initial={{
          workspace: state.step1?.workspace ?? "",
          website: state.step1?.website ?? "",
          streams: state.step1?.agent?.streams ?? ["AEO/GEO"],
        }}
        scannedHints={state.scannedHints ?? null}
      />
    </div>
  )
}

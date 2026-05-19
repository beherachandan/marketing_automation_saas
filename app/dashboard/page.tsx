import Link from "next/link"
import { loadOnboardingState } from "@/lib/persist"
import { isDevBypass } from "@/lib/persist-local"
import { generateAllFiles } from "@/lib/file-generators"
import type { OnboardingState } from "@/lib/schema"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const state = await loadOnboardingState()
  const complete =
    state.step1 &&
    state.step2 &&
    state.step3 &&
    state.step4 &&
    state.step5 &&
    state.step6 &&
    state.step7 &&
    state.step8

  const files = complete ? generateAllFiles(state as OnboardingState) : {}
  const fileCount = Object.keys(files).length

  return (
    <main className="min-h-screen px-10 py-10">
      <div className="max-w-4xl mx-auto">
        <p className="label-uppercase mb-2">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          {state.step1?.workspace ?? "Your workspace"}
        </h1>

        {!complete && (
          <div className="rounded-md border border-dashed border-border p-6 mb-6">
            <p className="text-[13px] text-muted-foreground mb-3">
              Onboarding isn't finished yet. Pick up where you left off.
            </p>
            <Link
              href="/onboarding/step-1"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-primary-foreground text-[13px] hover:opacity-90"
            >
              Resume onboarding →
            </Link>
          </div>
        )}

        {complete && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Status" value="Launched" accent="success" />
            <Stat label="Config files" value={String(fileCount)} />
            <Stat label="Seeds" value={String(state.step6?.seeds.length ?? 0)} />
            <Stat label="ICPs" value={String(state.step3?.icps.length ?? 0)} />
            <Stat label="Product" value={state.step2?.product.name ?? "—"} />
            <Stat
              label="Slack"
              value={state.step7?.slack.installed ? state.step7.slack.channelName ?? "ready" : "not installed"}
              accent={state.step7?.slack.installed ? "success" : "muted"}
            />
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-[15px] font-semibold mb-3">Next actions</h2>
          <ul className="flex flex-col gap-2 text-[13px]">
            <li className="rounded-md border border-border px-4 py-3">
              <span className="font-mono text-[12px] bg-secondary rounded px-1.5 py-0.5 mr-2">/audit</span>
              Run an audit on any URL from your Slack workspace.
            </li>
            <li className="rounded-md border border-border px-4 py-3">
              <span className="font-mono text-[12px] bg-secondary rounded px-1.5 py-0.5 mr-2">/draft</span>
              Generate a draft article from a seed topic.
            </li>
            <li className="rounded-md border border-border px-4 py-3 text-muted-foreground">
              Runs feed will show up here once the first command fires.
            </li>
          </ul>
        </section>

        {isDevBypass() && (
          <p className="text-[12px] text-muted-foreground">
            Dev mode active (DEV_BYPASS_AUTH=1) — state persisted to /tmp.
          </p>
        )}
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "success" | "muted"
}) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <p className="label-uppercase mb-1">{label}</p>
      <p
        className={
          accent === "success"
            ? "text-[15px] font-medium text-success"
            : accent === "muted"
              ? "text-[15px] font-medium text-muted-foreground"
              : "text-[15px] font-medium"
        }
      >
        {value}
      </p>
    </div>
  )
}

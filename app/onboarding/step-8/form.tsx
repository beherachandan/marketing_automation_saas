"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step8Schema, type Step8, type OnboardingState } from "@/lib/schema"
import { saveStep8, finalizeOnboardingAction } from "@/lib/persist-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Footer } from "@/components/onboarding/Footer"
import { cn } from "@/lib/cn"

type PartialState = Partial<OnboardingState>

const cronRows: Array<{ key: keyof Step8["crons"]; label: string; hint: string }> = [
  { key: "eodMemory", label: "End-of-day memory", hint: "Daily at 23:50 UTC — snapshots agent state" },
  { key: "weeklyDiscovery", label: "Weekly discovery", hint: "Mondays 08:00 UTC — expands seeds into pipeline" },
  { key: "monthlyCitation", label: "Monthly citation sweep", hint: "1st of month — audits outbound citations" },
  { key: "monthlyRubric", label: "Monthly rubric recalibration", hint: "1st of month — analyzes score drift" },
]

export function Step8Form({ initial, state }: { initial?: Step8; state: PartialState }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const { handleSubmit, watch, control, formState: { errors } } = useForm<Step8>({
    resolver: zodResolver(step8Schema),
    defaultValues: initial ?? {
      host: { mode: "managed" },
      crons: { eodMemory: true, weeklyDiscovery: true, monthlyCitation: false, monthlyRubric: false },
    },
  })

  const mode = watch("host.mode")

  const checks = buildPreflight(state)
  const blocking = checks.filter((c) => c.status === "fail").length > 0

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep8(data)
        await finalizeOnboardingAction()
        router.push("/dashboard")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Launch failed")
      }
    })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Host mode</CardTitle>
          <CardDescription>Where the engine runs. BYO is coming; managed is the MVP path.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Controller
            control={control}
            name="host.mode"
            render={({ field }) => (
              <>
                <HostOption
                  checked={field.value === "managed"}
                  onClick={() => field.onChange("managed")}
                  title="Managed (recommended)"
                  desc="We host the engine on our Vercel + Supabase stack. Zero ops."
                />
                <HostOption
                  checked={field.value === "byo"}
                  onClick={() => {}}
                  disabled
                  title="Bring your own host (soon)"
                  desc="Point the engine at your own EC2 or Fly.io runner."
                />
              </>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
          <CardDescription>Default cadence for the engine. Toggle freely — you can change these later.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {cronRows.map((row) => (
            <Controller
              key={row.key}
              control={control}
              name={`crons.${row.key}` as const}
              render={({ field }) => (
                <label className="flex items-start justify-between gap-4 py-3 cursor-pointer first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-medium">{row.label}</p>
                    <p className="text-[12px] text-muted-foreground">{row.hint}</p>
                  </div>
                  <Toggle checked={!!field.value} onChange={field.onChange} />
                </label>
              )}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-flight</CardTitle>
          <CardDescription>Quick sanity check on everything you configured.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {checks.map((c) => (
            <div key={c.key} className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">{c.label}</span>
              <span className={cn("tabular-nums text-[12px]", statusColor(c.status))}>{statusGlyph(c.status)} {c.detail}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer
        currentStep={8}
        onContinue={() => submit()}
        saving={isPending}
        canContinue={!blocking && mode === "managed"}
        hint={blocking ? "Resolve pre-flight failures to launch" : undefined}
      />
    </form>
  )
}

function HostOption({
  title,
  desc,
  checked,
  onClick,
  disabled,
}: {
  title: string
  desc: string
  checked: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-left rounded-md border px-4 py-3 transition",
        checked ? "border-primary bg-primary/5" : "border-input hover:bg-secondary",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full border",
            checked ? "border-primary bg-primary" : "border-input",
          )}
        />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <p className="text-[12px] text-muted-foreground mt-1 ml-5">{desc}</p>
    </button>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

type Check = { key: string; label: string; status: "ok" | "warn" | "fail"; detail: string }

function buildPreflight(state: PartialState): Check[] {
  const out: Check[] = []
  out.push({
    key: "workspace",
    label: "Workspace + agent",
    status: state.step1 ? "ok" : "fail",
    detail: state.step1 ? state.step1.workspace : "missing",
  })
  out.push({
    key: "product",
    label: "Product",
    status: state.step2 ? "ok" : "fail",
    detail: state.step2 ? state.step2.product.name : "missing",
  })
  const icpCount = state.step3?.icps?.length ?? 0
  out.push({
    key: "icps",
    label: "ICPs",
    status: icpCount > 0 ? "ok" : "fail",
    detail: `${icpCount} profile${icpCount === 1 ? "" : "s"}`,
  })
  out.push({
    key: "voice",
    label: "Voice",
    status: state.step4 ? "ok" : "fail",
    detail: state.step4 ? `${state.step4.attributes.length} attrs, ${state.step4.hardRules.length} rules` : "missing",
  })
  const sum = state.step5
    ? Object.values(state.step5.rubric).reduce((a: number, b) => a + (b as number), 0)
    : 0
  out.push({
    key: "rubric",
    label: "Rubric",
    status: sum === 100 ? "ok" : "fail",
    detail: sum === 100 ? `100 (pass ≥${state.step5!.passThreshold.toFixed(1)})` : `sum ${sum}`,
  })
  const seedCount = state.step6?.seeds?.length ?? 0
  out.push({
    key: "seeds",
    label: "Seeds",
    status: seedCount >= 5 ? "ok" : "fail",
    detail: `${seedCount} topics`,
  })
  out.push({
    key: "slack",
    label: "Slack",
    status: state.step7?.slack?.installed ? "ok" : "fail",
    detail: state.step7?.slack?.installed ? state.step7.slack.channelName ?? "installed" : "not installed",
  })
  const stubs = ["semrush", "dataforseo", "tavily"] as const
  const liveish = stubs.filter((k) => state.step7?.[k]?.status && state.step7[k].status !== "none")
  out.push({
    key: "data",
    label: "Data sources",
    status: liveish.length > 0 ? "ok" : "warn",
    detail: liveish.length > 0 ? liveish.join(", ") : "all demo",
  })
  const cms = state.step7?.cms?.provider ?? "none"
  out.push({
    key: "cms",
    label: "CMS",
    status: cms === "none" ? "warn" : "ok",
    detail: cms,
  })
  return out
}

function statusColor(s: Check["status"]) {
  if (s === "ok") return "text-success"
  if (s === "warn") return "text-yellow-600"
  return "text-destructive"
}

function statusGlyph(s: Check["status"]) {
  if (s === "ok") return "✓"
  if (s === "warn") return "!"
  return "✕"
}

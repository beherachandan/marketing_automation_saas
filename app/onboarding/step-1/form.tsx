"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step1Schema, type Step1 } from "@/lib/schema"
import { saveStep1 } from "@/lib/persist-actions"
import { Input, Label, FieldError } from "@/components/ui/input"
import { Footer } from "@/components/onboarding/Footer"
import { Globe } from "lucide-react"
import { useStreamContext } from "@/components/onboarding/Shell"
import { useFieldAnnotation } from "@/lib/use-field-annotation"

// ── Creative name generator ────────────────────────────────────────────────

function generateNameSuggestions(website: string): string[] {
  let slug = ""
  try {
    slug = new URL(website).hostname.replace(/^www\./, "").split(".")[0].toLowerCase()
  } catch {
    return ["Conductor", "Markflow", "Orgpulse", "Aeomark"]
  }

  const prefix = slug.slice(0, Math.min(4, slug.length))
  const suffix = slug.length > 4 ? slug.slice(-3) : slug.slice(-2)

  // Pull consonant-cluster prefix for punchy names
  const short = prefix.replace(/[aeiou]/g, "").slice(0, 3) || prefix.slice(0, 3)

  const suggestions = [
    // {prefix}mark — wayfinding marker for marketing
    capitalize(prefix) + "mark",
    // org + {slug} — organic demand + brand
    "Org" + capitalize(slug.slice(0, 4)),
    // {slug}flow — demand flow
    capitalize(prefix) + "flow",
    // creative portmanteau — org demand + suffix
    "Aeo" + capitalize(suffix),
  ]

  // Deduplicate and ensure 4 unique ones
  return [...new Set(suggestions)].slice(0, 4)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Component ──────────────────────────────────────────────────────────────

export function Step1Form({ initial }: { initial?: Step1 }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const tz = typeof window !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC"

  const { setLiveAgentName } = useStreamContext()
  const ann = {
    workspace:     useFieldAnnotation(1, "workspace", "Workspace"),
    agentName:     useFieldAnnotation(1, "agent.name", "Agent name"),
    agentRole:     useFieldAnnotation(1, "agent.role", "Agent role"),
    agentStreams:  useFieldAnnotation(1, "agent.streams", "Streams"),
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: initial
      ? {
          ...initial,
          agent: { ...initial.agent, role: initial.agent.role || "AI Marketing Agent" },
          user: {
            name: initial.user.name || "—",
            email: initial.user.email === "placeholder@setup.local" || !initial.user.email
              ? "placeholder@setup.local"
              : initial.user.email,
            timezone: initial.user.timezone || tz,
          },
        }
      : {
          workspace: "",
          website: "",
          agent: { name: "", role: "AI Marketing Agent", streams: ["AEO/GEO"] },
          user: { name: "—", email: "placeholder@setup.local", timezone: tz },
        },
  })

  const submit = handleSubmit((data) => {
    setServerError(null)
    start(async () => {
      try {
        await saveStep1(data)
        router.push("/onboarding/step-2")
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  const website = watch("website")
  const agentName = watch("agent.name")
  const suggestions = generateNameSuggestions(website ?? "")

  // Push live agent name to the right-panel diagram
  useEffect(() => {
    if (agentName) setLiveAgentName(agentName)
  }, [agentName, setLiveAgentName])

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {/* All hidden fields — carried through from step 0 */}
      <input type="hidden" {...register("website")} />
      <input type="hidden" {...register("workspace")} />
      <input type="hidden" {...register("agent.role")} />
      <input type="hidden" {...register("agent.streams.0")} />
      <input type="hidden" {...register("user.name")} />
      <input type="hidden" {...register("user.email")} />
      <input type="hidden" {...register("user.timezone")} />

      {/* Website pill — clicking goes back to setup */}
      {website && (
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="flex items-center gap-2 self-start rounded-md bg-muted/40 border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span className="font-mono">{website}</span>
          <span className="text-muted-foreground/50 ml-1">· edit</span>
        </button>
      )}

      {/* Agent name */}
      <section className="flex flex-col gap-4">
        <div>
          <Label htmlFor="agent-name">Name your agent *</Label>
          <p className="text-[12px] text-muted-foreground mb-3 mt-0.5">
            This is how your agent signs off on reports, Slack messages, and generated files.
          </p>
          <Input
            id="agent-name"
            autoFocus
            placeholder="e.g. Waymark"
            className="h-11 text-[15px]"
            {...register("agent.name")}
            onFocus={ann.agentName.onFocus}
            onBlur={ann.agentName.onBlur}
          />
          <FieldError message={errors.agent?.name?.message} />
        </div>

        {/* Creative suggestions */}
        <div>
          <p className="text-[11px] text-muted-foreground/60 mb-2">Suggestions based on your site</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setValue("agent.name", name, { shouldValidate: true })}
                className={
                  agentName === name
                    ? "px-3 py-1.5 rounded-lg text-[12px] font-medium border bg-primary text-primary-foreground border-primary"
                    : "px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-muted/30 text-foreground hover:bg-muted/60 transition-colors"
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {serverError && <p className="text-destructive text-[13px]">{serverError}</p>}

      <Footer currentStep={1} onContinue={submit} saving={isPending} />
    </form>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step7Schema, type Step7 } from "@/lib/schema"
import { saveStep7 } from "@/lib/persist-actions"
import { Input, Label, FieldError } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Footer } from "@/components/onboarding/Footer"
import { cn } from "@/lib/cn"
import { SlackSandbox } from "./SlackSandbox"
import { useFieldAnnotation } from "@/lib/use-field-annotation"

export function Step7Form({ initial, devBypass = false }: { initial?: Step7; devBypass?: boolean }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step7>({
    resolver: zodResolver(step7Schema),
    defaultValues: initial ?? {
      slack: { installed: false, botName: "conduct" },
      semrush: { status: "none" },
      dataforseo: { status: "none" },
      tavily: { status: "none" },
      cms: { provider: "none", collectionMap: {}, status: "none" },
    },
  })

  const slackInstalled = watch("slack.installed")
  const slackBotName = watch("slack.botName") || "conduct"
  const cmsProvider = watch("cms.provider")

  const ann = {
    slackWorkspace: useFieldAnnotation(7, "slack.workspace", "Slack workspace"),
    slackChannel:   useFieldAnnotation(7, "slack.channelId", "Slack channel"),
    slackBotName:   useFieldAnnotation(7, "slack.botName", "Bot name"),
    cmsSiteId:      useFieldAnnotation(7, "cms.siteId", "CMS site ID"),
    semrushKey:     useFieldAnnotation(7, "semrushApiKey", "Semrush API key"),
    dataforseoKey:  useFieldAnnotation(7, "dataforseoKey", "DataForSEO key"),
  }

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep7(data)
        router.push("/onboarding/step-8")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <ConnectionCard
        title="Slack"
        description="Required. /audit and /draft run here."
        status={slackInstalled ? "connected" : "none"}
      >
        {slackInstalled ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-success">✓ Installed</span>
              <Input placeholder="Channel ID (e.g. C0123456789)" {...register("slack.channelId")} />
              <Input placeholder="Channel name" {...register("slack.channelName")} />
            </div>
            <div className="grid grid-cols-[180px_1fr] gap-3 items-end">
              <div>
                <Label required hint="1–32 chars">Bot name</Label>
                <Input placeholder="conduct" {...register("slack.botName")} {...ann.slackBotName} />
                <FieldError message={errors.slack?.botName?.message} />
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Users in your workspace will invoke the bot as <code className="font-mono text-foreground">@{slackBotName}</code>.
                Try it below: <code className="font-mono text-foreground">@{slackBotName} audit https://…</code>
              </p>
            </div>
          </div>
        ) : devBypass ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setValue("slack.installed", true, { shouldValidate: true })
                setValue("slack.channelId", "C0B32DLC9AN", { shouldValidate: true })
                setValue("slack.channelName", "aeo-engine", { shouldValidate: true })
                setValue("slack.teamId", "T_DEV_LOCAL", { shouldValidate: true })
                setValue("slack.botName", "conduct", { shouldValidate: true })
              }}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-primary-foreground text-[13px] hover:opacity-90"
            >
              Fake install (dev)
            </button>
            <span className="text-[12px] text-muted-foreground">
              Pre-fills channel C0B32DLC9AN — real OAuth skipped.
            </span>
          </div>
        ) : (
          <a
            href="/api/slack/install"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-primary-foreground text-[13px] hover:opacity-90"
          >
            Install Slack app →
          </a>
        )}
      </ConnectionCard>

      {slackInstalled && (
        <SlackSandbox
          botName={slackBotName}
          channelName={watch("slack.channelName") || "aeo-engine"}
        />
      )}

      <ConnectionCard
        title="Semrush"
        description="Keyword research. Use demo data or plug your API key."
        status={watch("semrush.status")}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label optional>API key</Label>
            <Input type="password" {...register("semrush.apiKey")} {...ann.semrushKey} />
          </div>
          <select
            {...register("semrush.status")}
            className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
          >
            <option value="none">Skip</option>
            <option value="stub">Use demo data</option>
            <option value="connected">Live</option>
          </select>
        </div>
      </ConnectionCard>

      <ConnectionCard
        title="DataForSEO"
        description="Keyword volume + SERP context."
        status={watch("dataforseo.status")}
      >
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <Label optional>Username</Label>
            <Input {...register("dataforseo.username")} />
          </div>
          <div>
            <Label optional>Password</Label>
            <Input type="password" {...register("dataforseo.password")} {...ann.dataforseoKey} />
          </div>
          <select
            {...register("dataforseo.status")}
            className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
          >
            <option value="none">Skip</option>
            <option value="stub">Demo</option>
            <option value="connected">Live</option>
          </select>
        </div>
      </ConnectionCard>

      <ConnectionCard title="Tavily" description="Real-time web search for citations." status={watch("tavily.status")}>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label optional>API key</Label>
            <Input type="password" {...register("tavily.apiKey")} />
          </div>
          <select
            {...register("tavily.status")}
            className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
          >
            <option value="none">Skip</option>
            <option value="stub">Demo</option>
            <option value="connected">Live</option>
          </select>
        </div>
      </ConnectionCard>

      <ConnectionCard
        title="CMS"
        description="Publishing target. Webflow is the only live provider."
        status={watch("cms.status")}
      >
        <div className="grid grid-cols-[160px_1fr] gap-2 items-end">
          <div>
            <Label optional>Provider</Label>
            <select
              {...register("cms.provider")}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px]"
            >
              <option value="none">None</option>
              <option value="webflow">Webflow</option>
              <option value="wordpress" disabled>WordPress (soon)</option>
              <option value="contentful" disabled>Contentful (soon)</option>
              <option value="sanity" disabled>Sanity (soon)</option>
            </select>
          </div>
          {cmsProvider === "webflow" && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Site ID" {...register("cms.siteId")} {...ann.cmsSiteId} />
              <Input type="password" placeholder="API token" {...register("cms.token")} />
            </div>
          )}
        </div>
      </ConnectionCard>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer
        currentStep={7}
        onContinue={() => submit()}
        saving={isPending}
        canContinue={!!slackInstalled}
        hint={!slackInstalled ? "Install Slack to continue" : undefined}
      />
    </form>
  )
}

function ConnectionCard({
  title,
  description,
  status,
  children,
}: {
  title: string
  description: string
  status: string
  children: React.ReactNode
}) {
  const accent =
    status === "connected" ? "before:bg-success" : status === "stub" ? "before:bg-yellow-500" : "before:bg-zinc-300"
  return (
    <Card className={cn("relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1", accent)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

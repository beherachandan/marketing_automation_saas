"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step1Schema, type Step1, streamEnum } from "@/lib/schema"
import { saveStep1 } from "@/lib/persist-actions"
import { Input, Label, FieldError } from "@/components/ui/input"
import { Footer } from "@/components/onboarding/Footer"

const allStreams = streamEnum.options

export function Step1Form({ initial }: { initial?: Step1 }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: initial
      ? {
          ...initial,
          user: {
            ...initial.user,
            email: initial.user.email === "placeholder@setup.local" ? "" : initial.user.email,
          },
        }
      : {
          workspace: "",
          website: "",
          agent: { name: "Conduct", role: "Head of AEO Content", streams: ["AEO/GEO"] },
          user: { name: "", email: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
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

  const workspace = watch("workspace")
  const website = watch("website")

  return (
    <form onSubmit={submit} className="flex flex-col gap-10">
      {/* workspace + website carried through from zero screen */}
      <input type="hidden" {...register("workspace")} />
      <input type="hidden" {...register("website")} />

      {/* Setup summary — shows what was configured in the zero screen */}
      {(workspace || website) && (
        <div className="flex items-center gap-2 flex-wrap rounded-md bg-muted/40 border border-border px-3 py-2 text-[12px] text-muted-foreground">
          <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wide shrink-0">From setup</span>
          {workspace && (
            <span className="inline-flex items-center gap-1 bg-background border border-border rounded px-2 py-0.5">
              🏢 {workspace}
            </span>
          )}
          {website && (
            <span className="inline-flex items-center gap-1 bg-background border border-border rounded px-2 py-0.5 font-mono text-[11px]">
              🌐 {website}
            </span>
          )}
          <button
            type="button"
            onClick={() => router.push("/onboarding")}
            className="ml-auto text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2"
          >
            Edit
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground -mt-4">* required fields</p>

      <section>
        <h2 className="text-[15px] font-semibold mb-4">Agent identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="agent-name">Name *</Label>
            <Input id="agent-name" {...register("agent.name")} />
            <FieldError message={errors.agent?.name?.message} />
          </div>
          <div>
            <Label htmlFor="agent-role">Role *</Label>
            <Input id="agent-role" {...register("agent.role")} />
            <FieldError message={errors.agent?.role?.message} />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <Label>Active work streams *</Label>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2"
            >
              Change in setup
            </button>
          </div>
          <Controller
            name="agent.streams"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2 mt-2 flex-wrap">
                {allStreams.map((s) => {
                  const on = field.value.includes(s)
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() =>
                        field.onChange(on ? field.value.filter((v) => v !== s) : [...field.value, s])
                      }
                      className={`px-3 py-1.5 rounded-md text-[12px] border transition-colors ${
                        on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}
          />
          <FieldError message={errors.agent?.streams?.message} />
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold mb-4">Your details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="user-name">Full name *</Label>
            <Input id="user-name" {...register("user.name")} />
            <FieldError message={errors.user?.name?.message} />
          </div>
          <div>
            <Label htmlFor="user-email">Work email *</Label>
            <Input id="user-email" type="email" {...register("user.email")} />
            <FieldError message={errors.user?.email?.message} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="user-tz">Timezone *</Label>
            <Input id="user-tz" {...register("user.timezone")} />
            <FieldError message={errors.user?.timezone?.message} />
          </div>
        </div>
      </section>

      {serverError && <p className="text-destructive text-[13px]">{serverError}</p>}

      <Footer currentStep={1} onContinue={() => submit()} saving={isPending} />
    </form>
  )
}

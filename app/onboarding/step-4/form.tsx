"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step4Schema, type Step4 } from "@/lib/schema"
import { saveStep4 } from "@/lib/persist-actions"
import { Input, Textarea, Label, FieldError } from "@/components/ui/input"
import { Footer } from "@/components/onboarding/Footer"

const axes: Array<{ key: keyof Step4["tone"]; left: string; right: string }> = [
  { key: "formalCasual", left: "Formal", right: "Casual" },
  { key: "authoritativeFriendly", left: "Authoritative", right: "Friendly" },
  { key: "technicalConversational", left: "Technical", right: "Conversational" },
  { key: "playfulSerious", left: "Playful", right: "Serious" },
]

export function Step4Form({ initial, hasAutoFill }: { initial?: Step4; hasAutoFill?: boolean }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors, dirtyFields }, watch, setValue } = useForm<Step4>({
    resolver: zodResolver(step4Schema),
    defaultValues: initial ?? {
      tone: { formalCasual: 50, authoritativeFriendly: 50, technicalConversational: 50, playfulSerious: 50 },
      attributes: [],
      hardRules: [],
      forbiddenWords: "",
      examples: { good: "", bad: "" },
    },
  })

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep4(data)
        router.push("/onboarding/step-5")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  const attrs = watch("attributes")
  const rules = watch("hardRules")

  const mark = (dirty: unknown): "auto" | "edited" | null => {
    if (!hasAutoFill) return null
    return dirty ? "edited" : "auto"
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section>
        <h2 className="text-[15px] font-semibold mb-4">Tone axes</h2>
        <div className="flex flex-col gap-5">
          {axes.map((a) => (
            <Controller
              key={a.key}
              control={control}
              name={`tone.${a.key}` as const}
              render={({ field }) => (
                <div>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{a.left}</span>
                    <span className="font-mono">{field.value}</span>
                    <span>{a.right}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            />
          ))}
        </div>
      </section>

      <ListField
        label="Voice attributes"
        placeholder="e.g. crisp"
        values={attrs}
        max={5}
        optional
        onChange={(next) => setValue("attributes", next, { shouldValidate: true })}
      />

      <ListField
        label="Hard rules"
        placeholder="e.g. Never use the word 'synergy'"
        values={rules}
        max={20}
        optional
        onChange={(next) => setValue("hardRules", next, { shouldValidate: true })}
      />

      <div>
        <Label optional hint="comma-separated" marker={mark(dirtyFields.forbiddenWords)}>Forbidden words/phrases</Label>
        <Textarea rows={2} {...register("forbiddenWords")} />
        <FieldError message={errors.forbiddenWords?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required hint="20–2000 chars" marker={mark(dirtyFields.examples?.good)}>Good example</Label>
          <Textarea rows={5} {...register("examples.good")} />
          <FieldError message={errors.examples?.good?.message} />
        </div>
        <div>
          <Label required hint="20–2000 chars" marker={mark(dirtyFields.examples?.bad)}>Bad example</Label>
          <Textarea rows={5} {...register("examples.bad")} />
          <FieldError message={errors.examples?.bad?.message} />
        </div>
      </div>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer currentStep={4} onContinue={() => submit()} saving={isPending} />
    </form>
  )
}

function ListField({
  label,
  placeholder,
  values,
  max,
  onChange,
  optional,
}: {
  label: string
  placeholder: string
  values: string[]
  max: number
  onChange: (next: string[]) => void
  optional?: boolean
}) {
  const [draft, setDraft] = useState("")
  return (
    <div>
      <Label optional={optional} hint={`${values.length}/${max}`}>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (draft.trim() && values.length < max) {
                onChange([...values, draft.trim()])
                setDraft("")
              }
            }
          }}
        />
        <span className="text-[12px] text-muted-foreground self-center tabular-nums">
          {values.length}/{max}
        </span>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-[12px]">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step3Schema, type Step3 } from "@/lib/schema"
import { saveStep3 } from "@/lib/persist-actions"
import { Input, Textarea, Label, FieldError } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/onboarding/Footer"
import { useFieldAnnotation } from "@/lib/use-field-annotation"

function emptyIcp() {
  return { name: "", role: "", industry: "", pains: [""], goals: [""], jobsToBeDone: "" }
}

export function Step3Form({ initial, hasAutoFill }: { initial?: Step3; hasAutoFill?: boolean }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const form = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: initial ?? { icps: [emptyIcp()] },
  })
  const { register, handleSubmit, control, formState: { errors, dirtyFields } } = form
  const { fields, append, remove } = useFieldArray({ control, name: "icps" })

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep3(data)
        router.push("/onboarding/step-4")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  const mark = (dirty: unknown): "auto" | "edited" | null => {
    if (!hasAutoFill) return null
    return dirty ? "edited" : "auto"
  }

  const ann = {
    name:       useFieldAnnotation(3, "icps[].name", "Persona name"),
    role:       useFieldAnnotation(3, "icps[].role", "Role"),
    industry:   useFieldAnnotation(3, "icps[].industry", "Industry"),
    painPoints: useFieldAnnotation(3, "icps[].painPoints", "Pain points"),
    goals:      useFieldAnnotation(3, "icps[].goals", "Goals"),
    jtbd:       useFieldAnnotation(3, "icps[].jtbd", "Jobs to be done"),
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {fields.map((f, i) => (
        <Card key={f.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {i === 0 ? "Primary ICP" : `ICP ${i + 1}`}
            </CardTitle>
            {fields.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label required marker={mark(dirtyFields.icps?.[i]?.name)}>Persona name</Label>
                <Input {...register(`icps.${i}.name` as const)} {...ann.name} />
              </div>
              <div>
                <Label required marker={mark(dirtyFields.icps?.[i]?.role)}>Role</Label>
                <Input {...register(`icps.${i}.role` as const)} {...ann.role} />
              </div>
              <div>
                <Label required marker={mark(dirtyFields.icps?.[i]?.industry)}>Industry</Label>
                <Input {...register(`icps.${i}.industry` as const)} {...ann.industry} />
              </div>
            </div>

            <ArrayField form={form} name={`icps.${i}.pains`} label="Pain points" placeholder="e.g. Tedious report-building" required marker={mark(dirtyFields.icps?.[i]?.pains)} onFocusAnnotation={ann.painPoints.onFocus} onBlurAnnotation={ann.painPoints.onBlur} />
            <ArrayField form={form} name={`icps.${i}.goals`} label="Goals" placeholder="e.g. 10x content velocity" required marker={mark(dirtyFields.icps?.[i]?.goals)} onFocusAnnotation={ann.goals.onFocus} onBlurAnnotation={ann.goals.onBlur} />

            <div>
              <Label required hint="10–2000 chars" marker={mark(dirtyFields.icps?.[i]?.jobsToBeDone)}>Jobs to be done</Label>
              <Textarea rows={3} {...register(`icps.${i}.jobsToBeDone` as const)} {...ann.jtbd} />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={() => append(emptyIcp())}>+ Add another ICP</Button>
      <FieldError message={errors.icps?.message as string | undefined} />

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer currentStep={3} onContinue={() => submit()} saving={isPending} />
    </form>
  )
}

function ArrayField({
  form,
  name,
  label,
  placeholder,
  required,
  marker,
  onFocusAnnotation,
  onBlurAnnotation,
}: {
  form: ReturnType<typeof useForm<Step3>>
  name: `icps.${number}.pains` | `icps.${number}.goals`
  label: string
  placeholder: string
  required?: boolean
  marker?: "auto" | "edited" | null
  onFocusAnnotation?: () => void
  onBlurAnnotation?: () => void
}) {
  const values = (form.watch(name) ?? []) as string[]
  const set = (next: string[]) => form.setValue(name, next, { shouldValidate: true, shouldDirty: true })
  return (
    <div>
      <Label required={required} marker={marker}>{label}</Label>
      <div className="flex flex-col gap-2 mt-1">
        {values.map((v, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={v}
              placeholder={placeholder}
              onFocus={onFocusAnnotation}
              onBlur={onBlurAnnotation}
              onChange={(e) => {
                const next = [...values]
                next[idx] = e.target.value
                set(next)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={values.length === 1}
              onClick={() => set(values.filter((_, j) => j !== idx))}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => set([...values, ""])} className="self-start">
          + Add
        </Button>
      </div>
    </div>
  )
}

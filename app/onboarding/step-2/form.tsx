"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step2Schema, type Step2 } from "@/lib/schema"
import { saveStep2 } from "@/lib/persist-actions"
import { Input, Textarea, Label, FieldError } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/onboarding/Footer"

export function Step2Form({
  initial,
  suggested,
  hasAutoFill,
}: {
  initial?: Step2
  suggested?: Step2
  hasAutoFill?: boolean
}) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors, dirtyFields } } = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: initial ?? {
      product: {
        name: "",
        category: "",
        oneLiner: "",
        longDescription: "",
        features: [{ title: "", description: "" }],
        positioning: "",
      },
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "product.features" })

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep2(data)
        router.push("/onboarding/step-3")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  const autoFilled = hasAutoFill && !!suggested
  const mark = (dirty: unknown): "auto" | "edited" | null => {
    if (!autoFilled) return null
    return dirty ? "edited" : "auto"
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required marker={mark(dirtyFields.product?.name)}>Product name</Label>
          <Input {...register("product.name")} />
          <FieldError message={errors.product?.name?.message} />
        </div>
        <div>
          <Label required marker={mark(dirtyFields.product?.category)}>Category</Label>
          <Input {...register("product.category")} placeholder="e.g. EdTech SaaS" />
          <FieldError message={errors.product?.category?.message} />
        </div>
      </div>

      <div>
        <Label required hint="10–160 chars" marker={mark(dirtyFields.product?.oneLiner)}>One-liner</Label>
        <Input {...register("product.oneLiner")} placeholder="10–160 chars" />
        <FieldError message={errors.product?.oneLiner?.message} />
      </div>

      <div>
        <Label required hint="50–4000 chars" marker={mark(dirtyFields.product?.longDescription)}>Long description</Label>
        <Textarea rows={6} {...register("product.longDescription")} />
        <FieldError message={errors.product?.longDescription?.message} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required>Key features</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => append({ title: "", description: "" })}>
            + Add feature
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {fields.map((f, i) => {
            const titleMark = mark(dirtyFields.product?.features?.[i]?.title)
            const descMark = mark(dirtyFields.product?.features?.[i]?.description)
            return (
              <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <div className="relative">
                  <Input placeholder="Title" {...register(`product.features.${i}.title` as const)} />
                  {titleMark && <InlineMarker marker={titleMark} />}
                </div>
                <div className="relative">
                  <Input placeholder="Description" {...register(`product.features.${i}.description` as const)} />
                  {descMark && <InlineMarker marker={descMark} />}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} disabled={fields.length === 1}>
                  ✕
                </Button>
              </div>
            )
          })}
        </div>
        <FieldError message={errors.product?.features?.message as string | undefined} />
      </div>

      <div>
        <Label required hint="20–2000 chars" marker={mark(dirtyFields.product?.positioning)}>Positioning statement</Label>
        <Textarea rows={4} {...register("product.positioning")} />
        <FieldError message={errors.product?.positioning?.message} />
      </div>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer currentStep={2} onContinue={() => submit()} saving={isPending} />
    </form>
  )
}

function InlineMarker({ marker }: { marker: "auto" | "edited" }) {
  return (
    <span
      className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase tracking-wide ${
        marker === "auto" ? "text-muted-foreground/60" : "text-primary"
      }`}
      aria-hidden
    >
      {marker === "auto" ? "◇ auto" : "● edited"}
    </span>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step6Schema, type Step6 } from "@/lib/schema"
import { saveStep6 } from "@/lib/persist-actions"
import { Input, Textarea, Label, FieldError } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/onboarding/Footer"
import { useFieldAnnotation } from "@/lib/use-field-annotation"

export function Step6Form({ initial }: { initial?: Step6 }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [bulk, setBulk] = useState("")

  const { handleSubmit, watch, setValue, formState: { errors } } = useForm<Step6>({
    resolver: zodResolver(step6Schema),
    defaultValues: initial ?? { seeds: [] },
  })
  const seeds = watch("seeds") ?? []
  const setSeeds = (next: string[]) => setValue("seeds", next, { shouldValidate: true })
  const annSeeds = useFieldAnnotation(6, "seeds", "Demand seeds")

  const add = (s: string) => {
    const t = s.trim()
    if (!t || seeds.includes(t) || seeds.length >= 50) return
    setSeeds([...seeds, t])
  }
  const addBulk = () => {
    const parts = bulk
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const merged = [...seeds]
    for (const p of parts) {
      if (!merged.includes(p) && merged.length < 50) merged.push(p)
    }
    setSeeds(merged)
    setBulk("")
  }

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep6(data)
        router.push("/onboarding/step-7")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required hint={`${seeds.length}/50 · min 5`}>Seeds</Label>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. classroom assessment strategies"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={annSeeds.onFocus}
            onBlur={annSeeds.onBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add(draft)
                setDraft("")
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => { add(draft); setDraft("") }}>
            Add
          </Button>
        </div>
        {seeds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {seeds.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-[12px]">
                {s}
                <button
                  type="button"
                  onClick={() => setSeeds(seeds.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <FieldError message={(errors.seeds as { message?: string } | undefined)?.message} />
      </div>

      <div>
        <Label optional hint="newline or comma separated">Bulk paste</Label>
        <Textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <Button type="button" variant="outline" size="sm" onClick={addBulk} className="mt-2">
          Append {bulk.split(/[\n,]+/).filter((s) => s.trim()).length} seeds
        </Button>
      </div>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer
        currentStep={6}
        onContinue={() => submit()}
        saving={isPending}
        canContinue={seeds.length >= 5}
        hint={seeds.length < 5 ? `Add ${5 - seeds.length} more seeds` : undefined}
      />
    </form>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { step5Schema, type Step5, rubricDefaults } from "@/lib/schema"
import { saveStep5 } from "@/lib/persist-actions"
import { Input, Textarea, Label, FieldError } from "@/components/ui/input"
import { Footer } from "@/components/onboarding/Footer"
import { cn } from "@/lib/cn"
import { useFieldAnnotation } from "@/lib/use-field-annotation"

type RubricKey = keyof Step5["rubric"]
const rubricKeys: Array<{ key: RubricKey; label: string }> = [
  { key: "structure", label: "Structure" },
  { key: "factuality", label: "Factuality" },
  { key: "citation", label: "Citation" },
  { key: "clarity", label: "Clarity" },
  { key: "intent", label: "Intent match" },
  { key: "brandAlignment", label: "Brand alignment" },
  { key: "icpFit", label: "ICP fit" },
  { key: "freshness", label: "Freshness" },
  { key: "uniqueness", label: "Uniqueness" },
]

export function Step5Form({ initial }: { initial?: Step5 }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<Step5>({
    resolver: zodResolver(step5Schema),
    defaultValues: initial ?? {
      guidelines: {
        articleStructure: "H1 title → 1-paragraph intro → 3–5 H2 sections → Key takeaways list → Conclusion",
        urlFormat: "/blog/{slug}",
        headingPolicy: "Sentence case. H2 for main sections. H3 for sub-points only when needed.",
        citationPolicy: "At least 2 outbound links to authoritative sources; inline markdown format.",
      },
      rubric: rubricDefaults,
      passThreshold: 7.0,
    },
  })

  const rubric = watch("rubric")
  const sum = rubric ? Object.values(rubric).reduce((a, b) => a + b, 0) : 0
  const canContinue = sum === 100

  const ann = {
    articleStructure: useFieldAnnotation(5, "articleStructure", "Article structure"),
    urlFormat:        useFieldAnnotation(5, "urlFormat", "URL format"),
    passThreshold:    useFieldAnnotation(5, "passThreshold", "Pass threshold"),
    qapeStructure:    useFieldAnnotation(5, "rubric.qape_structure", "QAPE Structure"),
    earCoverage:      useFieldAnnotation(5, "rubric.ear_coverage", "EAR Coverage"),
    extractability:   useFieldAnnotation(5, "rubric.extractability", "Extractability"),
    trustSignals:     useFieldAnnotation(5, "rubric.trust_signals", "Trust Signals"),
    intentMatch:      useFieldAnnotation(5, "rubric.intent_match", "Intent Match"),
  }

  const submit = handleSubmit((data) => {
    setErr(null)
    start(async () => {
      try {
        await saveStep5(data)
        router.push("/onboarding/step-6")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold">Guidelines</h2>
        <div>
          <Label required>Article structure</Label>
          <Textarea rows={3} {...register("guidelines.articleStructure")} {...ann.articleStructure} />
          <FieldError message={errors.guidelines?.articleStructure?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>URL format</Label>
            <Input {...register("guidelines.urlFormat")} {...ann.urlFormat} />
            <FieldError message={errors.guidelines?.urlFormat?.message} />
          </div>
          <div>
            <Label required>Heading policy</Label>
            <Input {...register("guidelines.headingPolicy")} />
            <FieldError message={errors.guidelines?.headingPolicy?.message} />
          </div>
        </div>
        <div>
          <Label required>Citation policy</Label>
          <Textarea rows={2} {...register("guidelines.citationPolicy")} />
          <FieldError message={errors.guidelines?.citationPolicy?.message} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold">Scoring rubric</h2>
          <span
            className={cn(
              "font-mono tabular-nums text-[13px] px-2 py-0.5 rounded",
              sum === 100 ? "text-success bg-success/10" : "text-destructive bg-destructive/10",
            )}
          >
            {sum}/100
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {rubricKeys.map(({ key, label }) => (
            <Controller
              key={key}
              control={control}
              name={`rubric.${key}` as const}
              render={({ field }) => (
                <div className="grid grid-cols-[180px_1fr_56px] items-center gap-3">
                  <Label className="normal-case">{label}</Label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[12px] font-mono tabular-nums text-right">{field.value}%</span>
                </div>
              )}
            />
          ))}
        </div>
        <FieldError message={(errors.rubric as { message?: string } | undefined)?.message} />
      </section>

      <section>
        <Controller
          control={control}
          name="passThreshold"
          render={({ field }) => (
            <div className="grid grid-cols-[180px_1fr_56px] items-center gap-3">
              <Label className="normal-case">Pass threshold</Label>
              <input
                type="range"
                min={5}
                max={10}
                step={0.1}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-[12px] font-mono tabular-nums text-right">{Number(field.value).toFixed(1)}</span>
            </div>
          )}
        />
      </section>

      {err && <p className="text-destructive text-[13px]">{err}</p>}
      <Footer
        currentStep={5}
        onContinue={() => submit()}
        saving={isPending}
        canContinue={canContinue}
        hint={!canContinue ? `Weights must sum to 100 (now ${sum})` : undefined}
      />
    </form>
  )
}

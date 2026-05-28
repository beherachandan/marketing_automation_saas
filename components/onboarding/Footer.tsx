"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function Footer({
  currentStep,
  canContinue,
  onContinue,
  saving,
  hint,
}: {
  currentStep: number
  canContinue?: boolean
  onContinue: () => Promise<void> | void
  saving?: boolean
  hint?: string
}) {
  const router = useRouter()
  const back = currentStep === 1 ? "/onboarding" : `/onboarding/step-${currentStep - 1}`

  return (
    <footer className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => router.push(back as never)}>
        ← Back
      </Button>
      <div className="flex items-center gap-3">
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
        <Button
          type="submit"
          size="md"
          disabled={saving || canContinue === false}
        >
          {saving ? "Saving…" : currentStep === 8 ? "Launch engine" : "Continue →"}
        </Button>
      </div>
    </footer>
  )
}

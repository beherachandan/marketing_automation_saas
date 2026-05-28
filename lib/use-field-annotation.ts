"use client"

import { useCallback } from "react"
import { useStreamContext } from "@/components/onboarding/Shell"
import { ONBOARDING_ANNOTATIONS } from "@/lib/onboarding-annotations"

/**
 * Returns focus/blur handlers for a given step + field key.
 * Usage: const { onFocus, onBlur } = useFieldAnnotation(1, "workspace", "Workspace")
 */
export function useFieldAnnotation(
  step: number,
  fieldKey: string,
  fieldLabel?: string,
) {
  const { setActiveAnnotation } = useStreamContext()

  const annotation = ONBOARDING_ANNOTATIONS[step]?.[fieldKey] ?? null

  const onFocus = useCallback(() => {
    if (annotation) setActiveAnnotation(annotation, fieldLabel)
  }, [annotation, fieldLabel, setActiveAnnotation])

  const onBlur = useCallback(() => {
    setActiveAnnotation(null)
  }, [setActiveAnnotation])

  return { onFocus, onBlur }
}

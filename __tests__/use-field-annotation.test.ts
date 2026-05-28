import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Mock Shell context so the hook can be tested in isolation
const mockSetActiveAnnotation = vi.fn()
vi.mock("@/components/onboarding/Shell", () => ({
  useStreamContext: () => ({
    setActiveAnnotation: mockSetActiveAnnotation,
  }),
}))

import { useFieldAnnotation } from "@/lib/use-field-annotation"

describe("useFieldAnnotation", () => {
  beforeEach(() => {
    mockSetActiveAnnotation.mockClear()
  })

  it("onFocus calls setActiveAnnotation with the matching annotation and label", () => {
    const { result } = renderHook(() => useFieldAnnotation(1, "workspace", "Workspace"))

    act(() => {
      result.current.onFocus()
    })

    expect(mockSetActiveAnnotation).toHaveBeenCalledOnce()
    const [annotation, label] = mockSetActiveAnnotation.mock.calls[0]
    expect(annotation).not.toBeNull()
    expect(annotation.agentLabel).toContain("B3")
    expect(label).toBe("Workspace")
  })

  it("onBlur calls setActiveAnnotation(null)", () => {
    const { result } = renderHook(() => useFieldAnnotation(1, "workspace", "Workspace"))

    act(() => {
      result.current.onBlur()
    })

    expect(mockSetActiveAnnotation).toHaveBeenCalledWith(null)
  })

  it("onFocus does nothing for unknown fieldKey (no annotation exists)", () => {
    const { result } = renderHook(() => useFieldAnnotation(1, "nonexistent_field"))

    act(() => {
      result.current.onFocus()
    })

    expect(mockSetActiveAnnotation).not.toHaveBeenCalled()
  })

  it("onFocus works for all 7 steps with their primary fields", () => {
    const testCases: [number, string][] = [
      [1, "workspace"],
      [2, "product.name"],
      [3, "icps[].name"],
      [4, "tone.formalCasual"],
      [5, "rubric.qape_structure"],
      [6, "seeds"],
      [7, "slack.channelId"],
    ]

    for (const [step, field] of testCases) {
      mockSetActiveAnnotation.mockClear()
      const { result } = renderHook(() => useFieldAnnotation(step, field, field))

      act(() => {
        result.current.onFocus()
      })

      expect(mockSetActiveAnnotation, `step ${step} field "${field}" did not call setActiveAnnotation`).toHaveBeenCalled()
      const [annotation] = mockSetActiveAnnotation.mock.calls[0]
      expect(annotation, `step ${step} field "${field}" returned null annotation`).not.toBeNull()
    }
  })
})

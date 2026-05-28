import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AnnotationCard } from "@/components/onboarding/AnnotationCard"
import type { AnnotationCardData } from "@/lib/onboarding-annotations"

const ANNOTATION: AnnotationCardData = {
  agentLabel: "B3 · Brief Generator",
  agentRole: "Builds content briefs from demand signals",
  actionCopy: "Signs every brief it produces with your workspace name — creating your content identity across all outputs.",
  secondaryAgents: ["O1 · Pipeline Manager (names your Slack channel #waymark-{workspace})"],
}

describe("AnnotationCard", () => {
  it("renders null state prompt when annotation is null", () => {
    render(<AnnotationCard annotation={null} />)
    expect(screen.getByText(/focus a field/i)).toBeInTheDocument()
  })

  it("renders agent label when annotation is provided", () => {
    render(<AnnotationCard annotation={ANNOTATION} />)
    expect(screen.getByText("B3 · Brief Generator")).toBeInTheDocument()
  })

  it("renders agent role", () => {
    render(<AnnotationCard annotation={ANNOTATION} />)
    expect(screen.getByText("Builds content briefs from demand signals")).toBeInTheDocument()
  })

  it("renders actionCopy", () => {
    render(<AnnotationCard annotation={ANNOTATION} />)
    expect(screen.getByText(ANNOTATION.actionCopy)).toBeInTheDocument()
  })

  it("renders secondary agents when present", () => {
    render(<AnnotationCard annotation={ANNOTATION} />)
    expect(screen.getByText(/O1 · Pipeline Manager/)).toBeInTheDocument()
  })

  it("does not render 'Also used by' section when secondaryAgents is absent", () => {
    const noSecondary: AnnotationCardData = { ...ANNOTATION, secondaryAgents: undefined }
    render(<AnnotationCard annotation={noSecondary} />)
    expect(screen.queryByText(/also used by/i)).not.toBeInTheDocument()
  })

  it("renders field label when provided", () => {
    render(<AnnotationCard annotation={ANNOTATION} fieldLabel="Workspace" />)
    expect(screen.getByText("Workspace")).toBeInTheDocument()
  })

  it("renders empty prompt when annotation starts as null", () => {
    render(<AnnotationCard annotation={null} />)
    expect(screen.getByText(/focus a field/i)).toBeInTheDocument()
  })
})

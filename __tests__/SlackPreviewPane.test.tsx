import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SlackPreviewPane } from "@/components/onboarding/SlackPreviewPane"

describe("SlackPreviewPane", () => {
  it("renders the default Wayground example topic", () => {
    render(<SlackPreviewPane />)
    expect(screen.getByText(/AI is changing B2B SaaS buying/i)).toBeInTheDocument()
  })

  it("renders a custom topic when provided", () => {
    render(<SlackPreviewPane topic="How to write AEO-optimised content" />)
    expect(screen.getByText("How to write AEO-optimised content")).toBeInTheDocument()
  })

  it("renders the D-gate pass badge when score ≥ 7.0", () => {
    render(<SlackPreviewPane />)
    expect(screen.getByText(/D-gate PASS/i)).toBeInTheDocument()
  })

  it("renders the total score 8.4/10", () => {
    render(<SlackPreviewPane />)
    expect(screen.getByText("8.4/10")).toBeInTheDocument()
  })

  it("renders all 5 AEO dimension labels", () => {
    render(<SlackPreviewPane />)
    const dims = ["QAPE Structure", "EAR Coverage", "Extractability", "Trust Signals", "Intent Match"]
    for (const dim of dims) {
      expect(screen.getByText(dim)).toBeInTheDocument()
    }
  })

  it("renders Approve and Request revision buttons", () => {
    render(<SlackPreviewPane />)
    expect(screen.getByText("Approve")).toBeInTheDocument()
    expect(screen.getByText("Request revision")).toBeInTheDocument()
  })

  it("renders the agent name in the bot header", () => {
    render(<SlackPreviewPane agentName="Waymark" />)
    expect(screen.getByText("Waymark")).toBeInTheDocument()
  })

  it("renders caption when provided", () => {
    render(<SlackPreviewPane caption="Here's what an actual Waymark approval looks like." />)
    expect(screen.getByText("Here's what an actual Waymark approval looks like.")).toBeInTheDocument()
  })

  it("does not render caption when not provided", () => {
    render(<SlackPreviewPane />)
    expect(screen.queryByText(/actual Waymark approval/)).not.toBeInTheDocument()
  })
})

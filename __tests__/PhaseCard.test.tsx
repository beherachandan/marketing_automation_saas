import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PhaseCard } from "@/components/onboarding/PhaseCard"

const BASE_PROPS = {
  phase: 1,
  agentId: "O1",
  agentLabel: "O1 · Pipeline Manager",
  title: "Workspace & Agent Identity",
  description: "Give your agent a name, pick your content streams, connect your site.",
  capability: "your agent knows who it is and what channels it works across",
  icon: "🏢",
}

describe("PhaseCard", () => {
  it("renders phase title", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText("Workspace & Agent Identity")).toBeInTheDocument()
  })

  it("renders agent ID badge", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText("O1")).toBeInTheDocument()
  })

  it("renders description", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText(BASE_PROPS.description)).toBeInTheDocument()
  })

  it("renders capability statement with 'After this:' prefix", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText("After this:")).toBeInTheDocument()
    expect(screen.getByText(BASE_PROPS.capability)).toBeInTheDocument()
  })

  it("renders agent label in footer", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText("O1 · Pipeline Manager")).toBeInTheDocument()
  })

  it("renders icon", () => {
    render(<PhaseCard {...BASE_PROPS} />)
    expect(screen.getByText("🏢")).toBeInTheDocument()
  })

  it("does not crash for all 7 phases (color coverage)", () => {
    for (let phase = 1; phase <= 7; phase++) {
      const { unmount } = render(<PhaseCard {...BASE_PROPS} phase={phase} />)
      unmount()
    }
  })
})

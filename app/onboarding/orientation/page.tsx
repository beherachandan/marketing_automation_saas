import Link from "next/link"
import { Building2, Package, Users, Palette, Target, Sprout, Plug } from "lucide-react"
import { PhaseCard } from "@/components/onboarding/PhaseCard"
import { SlackPreviewPane } from "@/components/onboarding/SlackPreviewPane"

export const dynamic = "force-dynamic"

const PHASES = [
  {
    phase: 1,
    agentId: "O1",
    agentLabel: "O1 · Pipeline Manager",
    title: "Workspace & Agent Identity",
    description: "Give your agent a name, pick your content streams, connect your site.",
    capability: "your agent knows who it is and what channels it works across",
    icon: <Building2 />,
  },
  {
    phase: 2,
    agentId: "B3",
    agentLabel: "B3 · Brief Generator",
    title: "Product Context",
    description: "Describe your product, ICP, and competitive positioning.",
    capability: "B3 can generate on-brief content without you explaining your product each time",
    icon: <Package />,
  },
  {
    phase: 3,
    agentId: "D4",
    agentLabel: "D4 · Brand Fit",
    title: "ICP Profiles",
    description: "Define who you're writing for — roles, pains, goals, jobs-to-be-done.",
    capability: "D4 rejects any draft that speaks to the wrong audience before you see it",
    icon: <Users />,
  },
  {
    phase: 4,
    agentId: "C3",
    agentLabel: "C3 · Long-form Writer",
    title: "Brand Voice",
    description: "Set tone sliders, list forbidden words, share approved examples.",
    capability: "C3 writes in your voice — not a generic AI voice — from the first draft",
    icon: <Palette />,
  },
  {
    phase: 5,
    agentId: "D1",
    agentLabel: "D1 · GEO Scorer",
    title: "Scoring Rubric",
    description: "Calibrate the 5 GEO dimensions that gate every piece of content.",
    capability: "D1 scores every draft before it reaches you — only PASS articles enter your queue",
    icon: <Target />,
  },
  {
    phase: 6,
    agentId: "A1",
    agentLabel: "A1 · SERP Scout",
    title: "Demand Seeds",
    description: "Add your starting topic seeds — competitors, questions, product areas.",
    capability: "A1 runs weekly gap analysis against each seed and surfaces net-new opportunities",
    icon: <Sprout />,
  },
  {
    phase: 7,
    agentId: "F2",
    agentLabel: "F2 · Publisher",
    title: "Integrations",
    description: "Connect Slack, your CMS, and optional data source APIs.",
    capability: "approved content publishes directly to your CMS without copy-paste — ever",
    icon: <Plug />,
  },
]

const VOCABULARY = [
  {
    term: "D-gate",
    definition:
      "The quality checkpoint every draft passes before you see it. Scored on 5 GEO dimensions (QAPE, EAR, Extractability, Trust, Intent). Threshold: 7.0/10.",
  },
  {
    term: "Approve / Request revision",
    definition:
      "Your two actions in Slack. Approve ships the article to your CMS. Request revision sends it back to C3 with your note.",
  },
  {
    term: "Stream",
    definition:
      "A content workstream. SEO, AEO/GEO, and Paid are independent pipelines. You activate only what's relevant to your team.",
  },
  {
    term: "Demand seed",
    definition:
      "A topic, competitor, or product area that drives gap analysis. A1 scans weekly; you only see gaps that matter.",
  },
] as const

export default function OrientationPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: orientation content (~60%) ─────────────────── */}
      <div className="flex-[60] flex flex-col min-h-screen border-r border-border overflow-auto">
        {/* top bar */}
        <div className="px-10 pt-8 pb-0 flex items-center gap-3 shrink-0">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Waymark</span>
          <span className="text-[11px] text-muted-foreground font-mono">/ calibration</span>
        </div>

        <div className="flex-1 px-10 pt-8 pb-16 max-w-[580px]">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground mb-2">
              Before you start
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight leading-tight text-foreground mb-3">
              You're calibrating<br />a marketing team
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Each step below configures a different agent. By the end, you'll have a 7-phase pipeline that
              finds topics, writes to your brand voice, scores for AI citation, and publishes — all in Slack.
            </p>
          </div>

          {/* Phase cards */}
          <div className="flex flex-col gap-3 mb-10">
            {PHASES.map((p) => (
              <PhaseCard key={p.phase} {...p} />
            ))}
          </div>

          {/* Vocabulary section */}
          <div className="mb-10">
            <h2 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              <span>Terms you'll see throughout</span>
              <span className="h-px flex-1 bg-border" />
            </h2>
            <div className="flex flex-col gap-2.5">
              {VOCABULARY.map((v) => (
                <div key={v.term} className="flex gap-3">
                  <span className="text-[12px] font-semibold text-foreground shrink-0 w-32 pt-0.5">
                    {v.term}
                  </span>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{v.definition}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — below all content, natural scroll gate */}
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-muted-foreground/60 text-center">
              7 steps · ~15 minutes · all reversible later
            </p>
            <Link
              href="/onboarding/step-1"
              className="flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Start calibrating your agents
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right: Slack preview (~40%) ───────────────────────── */}
      <div className="flex-[40] bg-surface flex flex-col overflow-auto">
        <div className="sticky top-0 px-8 pt-8 pb-6">
          <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground mb-6">
            What you're building toward
          </p>
          <SlackPreviewPane
            caption="Here's what an actual Waymark approval looks like — from Wayground's pipeline. You'll see this in Slack once your agents are calibrated."
          />

          {/* Evolution note */}
          <div className="mt-6 rounded-lg border border-border bg-white p-4">
            <p className="text-[12px] font-semibold text-foreground mb-1.5">This team gets smarter over time</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Every article you approve in Slack teaches C3 your preferences. Every revision request sharpens
              D4's brand checks. The more you use it, the less you need to correct.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

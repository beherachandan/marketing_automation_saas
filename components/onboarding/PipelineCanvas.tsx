"use client"

import { memo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/cn"
import { ChevronRight, Lock, ChevronDown, ChevronUp } from "lucide-react"

// ─── types ────────────────────────────────────────────────────────────────────

export interface PipelineConfiguredData {
  agentName?: string
  streams?: string[]
  productName?: string
  icpRoles?: string[]
  toneLabel?: string
  formalCasual?: number
  passThreshold?: number
  seedLabel?: string
  slackChannel?: string
  cmsProvider?: string
}

interface PipelineCanvasProps {
  completedSteps: number[]
  currentStep: number
  configuredData?: PipelineConfiguredData
  /** skill IDs being configured at the current onboarding step — highlighted in chips */
  activeStepSkillIds?: string[]
  /** called when user clicks a chip that has a skill doc */
  onChipClick?: (skillId: string) => void
}

// ─── workflow definitions ─────────────────────────────────────────────────────

interface WorkflowAgent {
  code: string
  label: string
  description: string
  /** which onboarding step (1–8) activates this agent */
  unlocksAt: number
  /** maps to SKILL_DEFS id — null means no skill doc */
  skillId: string | null
}

interface Workflow {
  id: string
  name: string
  channel: "GEO" | "SEO" | "Paid" | "Cross"
  /** one-line description for dead-state tooltip */
  description?: string
  agents?: WorkflowAgent[]
  /** locked = dead-state: show name+tooltip only, no chips */
  locked?: boolean
}

// O1 prepended inline to each active workflow row
const O1: WorkflowAgent = {
  code: "O1",
  label: "Pipeline Mgr",
  description: "Coordinates all workflows — routes jobs, monitors gates, retries failures. Configures: cron schedule, retry logic, gate thresholds.",
  unlocksAt: 1,
  skillId: null,
}

const WORKFLOWS: Workflow[] = [
  // ── Active workflows ──────────────────────────────────────────────────────
  {
    id: "geo-content",
    name: "GEO Content",
    channel: "GEO",
    agents: [
      { code: "A1", label: "Keyword Research", description: "Finds keyword gaps and AI citation opportunities. Agent = LLM + Semrush/DataForSEO tools.", unlocksAt: 6, skillId: "keyword-research" },
      { code: "B3", label: "Brief Generator",  description: "Generates a structured content brief from your ICP and seeds. Agent = LLM + product context.", unlocksAt: 2, skillId: "content-rubric" },
      { code: "C3", label: "Content Writer",   description: "Writes long-form content in your brand voice. Agent = LLM + brand voice + rubric tools.", unlocksAt: 4, skillId: "ai-draft" },
      { code: "D1", label: "GEO Scorer",       description: "Scores every draft against your 5-dimension D-gate rubric before it reaches you.", unlocksAt: 5, skillId: "content-rubric" },
      { code: "F2", label: "Publisher",        description: "Publishes approved content to your CMS and posts to Slack. No skill doc — integration only.", unlocksAt: 7, skillId: null },
    ],
  },
  {
    id: "seo-audit",
    name: "SEO Audit & Fix",
    channel: "SEO",
    agents: [
      { code: "A1", label: "Keyword Research", description: "Scans your site for ranking gaps and SERP opportunities. Agent = LLM + Semrush tools.", unlocksAt: 6, skillId: "keyword-research" },
      { code: "D3", label: "SEO On-page",      description: "Audits metadata, headings, and internal links per page. Agent = LLM + crawler tools.", unlocksAt: 5, skillId: "on-page-audit" },
      { code: "F2", label: "Publisher",        description: "Applies SEO fixes and publishes the updated page.", unlocksAt: 7, skillId: null },
    ],
  },
  {
    id: "geo-refresh",
    name: "GEO Content Refresh",
    channel: "GEO",
    agents: [
      { code: "G1", label: "Citation Tracker", description: "Tracks citation share across ChatGPT, Perplexity, Google AI. Agent = LLM + monitoring tools.", unlocksAt: 1, skillId: "citation-audit" },
      { code: "C3", label: "Content Writer",   description: "Refreshes existing content to reclaim lost AI citations.", unlocksAt: 4, skillId: "ai-draft" },
      { code: "D1", label: "GEO Scorer",       description: "Re-scores the refreshed draft against your rubric before re-publishing.", unlocksAt: 5, skillId: "content-rubric" },
      { code: "F2", label: "Publisher",        description: "Republishes the updated article and notifies via Slack.", unlocksAt: 7, skillId: null },
    ],
  },

  // ── Locked / dead-state workflows ─────────────────────────────────────────
  {
    id: "answer-engine-audit",
    name: "Answer Engine Audit",
    channel: "GEO",
    locked: true,
    description: "Tests your content across ChatGPT, Perplexity, Claude, and Google AI to measure citation probability vs. competitors.",
  },
  {
    id: "entity-optimization",
    name: "Entity Optimization",
    channel: "GEO",
    locked: true,
    description: "Enriches content with structured data and entity density to improve AI discoverability and knowledge graph presence.",
  },
  {
    id: "competitor-gap",
    name: "Competitor Gap",
    channel: "SEO",
    locked: true,
    description: "Flags high-intent keywords your competitors rank for but you don't — with actionable content recommendations.",
  },
  {
    id: "content-refresh-priority",
    name: "Content Refresh Priority",
    channel: "SEO",
    locked: true,
    description: "Surfaces your underperforming indexed pages with specific refresh recommendations to recover lost rankings.",
  },
  {
    id: "semantic-clustering",
    name: "Semantic Clustering",
    channel: "SEO",
    locked: true,
    description: "Groups related keywords into topic clusters to build topical authority and improve crawl efficiency.",
  },
  {
    id: "internal-linking",
    name: "Internal Linking",
    channel: "SEO",
    locked: true,
    description: "Recommends strategic internal links across your content to boost page authority and improve user flow.",
  },
  {
    id: "ad-copy-optimization",
    name: "Ad Copy Optimization",
    channel: "Paid",
    locked: true,
    description: "Generates and A/B tests headlines, descriptions, and CTAs against competitor ad copy at scale.",
  },
  {
    id: "landing-page-performance",
    name: "Landing Page Performance",
    channel: "Paid",
    locked: true,
    description: "Analyzes conversion barriers and generates personalized landing page variants for top audience segments.",
  },
  {
    id: "audience-segmentation",
    name: "Audience Segmentation",
    channel: "Paid",
    locked: true,
    description: "Clusters prospects by behavior and intent, recommending segment-specific messaging and bid strategies.",
  },
  {
    id: "competitor-outwatch",
    name: "Competitor Outwatch",
    channel: "Cross",
    locked: true,
    description: "Monitors competitor publishing velocity and content strategy, surfacing response opportunities in real time.",
  },
  {
    id: "content-calendar",
    name: "Content Calendar",
    channel: "Cross",
    locked: true,
    description: "Orchestrates multi-channel content distribution with platform-native formatting and scheduling.",
  },
  {
    id: "attribution-roi",
    name: "Attribution & ROI",
    channel: "Cross",
    locked: true,
    description: "Connects content touches to pipeline opportunities across all channels — from first click to closed deal.",
  },
]

const ACTIVE_WORKFLOWS = WORKFLOWS.filter((w) => !w.locked)
const LOCKED_WORKFLOWS = WORKFLOWS.filter((w) => w.locked)

// ─── channel badge ────────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<string, string> = {
  GEO:   "text-violet-500 bg-violet-50 border-violet-200",
  SEO:   "text-emerald-600 bg-emerald-50 border-emerald-200",
  Paid:  "text-amber-600 bg-amber-50 border-amber-200",
  Cross: "text-slate-500 bg-slate-50 border-slate-200",
}

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className={cn(
      "text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded border leading-none",
      CHANNEL_COLOR[channel] ?? "text-slate-400 bg-slate-50 border-slate-200",
    )}>
      {channel}
    </span>
  )
}

// ─── agent chip ───────────────────────────────────────────────────────────────

type ChipState = "active" | "completed" | "pending" | "locked"

function chipClass(state: ChipState) {
  switch (state) {
    case "active":    return "bg-[hsl(243_75%_58%)] border-[hsl(243_75%_52%)] text-white"
    case "completed": return "bg-[hsl(142_71%_45%)] border-[hsl(142_71%_38%)] text-white"
    case "pending":   return "bg-[hsl(38_90%_96%)] border-[hsl(38_60%_80%)] text-[hsl(30_30%_45%)]"
    case "locked":    return "bg-transparent border-dashed border-[hsl(240_6%_90%)] text-[hsl(240_4%_52%)]/40"
  }
}

function AgentNode({
  code,
  label,
  description,
  state,
  skillId,
  isStepHighlighted,
  onChipClick,
}: {
  code: string
  label: string
  description: string
  state: ChipState
  skillId: string | null
  isStepHighlighted?: boolean
  onChipClick?: (skillId: string) => void
}) {
  const [hover, setHover] = useState(false)
  const isClickable = !!skillId && !!onChipClick && state !== "locked"

  return (
    <div className="relative flex flex-col items-center">
      <div
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={cn(
          "flex flex-col items-center justify-center px-2 py-1.5 rounded-md border select-none transition-all duration-150",
          "min-w-[72px] text-center",
          chipClass(state),
          state === "pending" && "animate-pulse-border",
          isClickable && "cursor-pointer hover:ring-1 hover:ring-[hsl(243_75%_58%)]/40",
          isStepHighlighted && state === "pending" && "ring-1 ring-[hsl(243_75%_58%)]/50 shadow-sm",
        )}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => isClickable && onChipClick!(skillId!)}
        onKeyDown={(e) => e.key === "Enter" && isClickable && onChipClick!(skillId!)}
      >
        <span className={cn(
          "text-[8.5px] font-mono leading-none mb-0.5",
          state === "active" || state === "completed" ? "opacity-60" : "opacity-50",
        )}>
          {code}
        </span>
        <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">
          {label}
        </span>
      </div>

      {/* tooltip — light, below the chip */}
      <AnimatePresence>
        {hover && state !== "locked" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1.5 z-30 w-52 rounded-md bg-white border border-[hsl(240_6%_90%)] shadow-md px-2.5 py-2 pointer-events-none"
          >
            <p className="text-[10px] font-semibold text-[hsl(0_0%_7%)] leading-tight mb-0.5">
              {code} · {label}
            </p>
            <p className="text-[9.5px] text-[hsl(240_4%_52%)] leading-snug">
              {description}
            </p>
            {isClickable && (
              <p className="text-[9px] text-[hsl(243_75%_58%)] mt-1 font-medium">
                Click to view skill doc →
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── active workflow row ──────────────────────────────────────────────────────

function ActiveWorkflowRow({
  workflow,
  completedSteps,
  currentStep,
  activeStepSkillIds,
  onChipClick,
  isLast,
}: {
  workflow: Workflow
  completedSteps: number[]
  currentStep: number
  activeStepSkillIds?: string[]
  onChipClick?: (skillId: string) => void
  isLast?: boolean
}) {
  const agents = workflow.agents ?? []

  function agentState(agent: WorkflowAgent): ChipState {
    if (completedSteps.includes(agent.unlocksAt)) return "completed"
    if (currentStep === agent.unlocksAt) return "active"
    if (currentStep > agent.unlocksAt) return "completed"
    return "pending"
  }

  const isWorkflowActive = agents.some((a) => currentStep >= a.unlocksAt)

  // O1 state derived from step 1
  const o1State: ChipState = completedSteps.includes(1)
    ? "completed"
    : currentStep === 1
      ? "active"
      : "pending"

  return (
    <div className={cn(
      "px-3 py-2.5",
      !isLast && "border-b border-[hsl(240_6%_90%)]",
      "border-l-2",
      isWorkflowActive ? "border-l-[hsl(243_75%_58%)]" : "border-l-transparent",
    )}>
      <div className="flex items-center gap-1.5 mb-2">
        <ChannelBadge channel={workflow.channel} />
        <span className={cn(
          "text-[10px] uppercase tracking-widest font-medium",
          isWorkflowActive ? "text-[hsl(0_0%_7%)]" : "text-[hsl(240_4%_52%)]",
        )}>
          {workflow.name}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {/* O1 inline */}
        <AgentNode
          code={O1.code}
          label={O1.label}
          description={O1.description}
          state={o1State}
          skillId={O1.skillId}
          onChipClick={onChipClick}
        />
        {/* divider */}
        <div className="h-5 w-px bg-[hsl(240_6%_88%)] mx-0.5 shrink-0" />
        {/* workflow agents */}
        {agents.map((agent, i) => (
          <div key={`${workflow.id}-${agent.code}-${i}`} className="flex items-center gap-1">
            <AgentNode
              code={agent.code}
              label={agent.label}
              description={agent.description}
              state={agentState(agent)}
              skillId={agent.skillId}
              isStepHighlighted={!!agent.skillId && activeStepSkillIds?.includes(agent.skillId)}
              onChipClick={onChipClick}
            />
            {i < agents.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-[hsl(240_4%_52%)]/50" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── locked workflow row ──────────────────────────────────────────────────────

function LockedWorkflowRow({ workflow }: { workflow: Workflow }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="relative px-3 py-2 border-b border-[hsl(240_6%_90%)] last:border-b-0 flex items-center gap-2 opacity-50"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Lock className="h-2.5 w-2.5 text-[hsl(240_4%_52%)] shrink-0" />
      <ChannelBadge channel={workflow.channel} />
      <span className="text-[10px] font-medium text-[hsl(240_4%_52%)] truncate">
        {workflow.name}
      </span>

      <AnimatePresence>
        {hover && workflow.description && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-3 mt-1 z-30 w-56 rounded-md bg-[hsl(0_0%_12%)] border border-[hsl(0_0%_22%)] shadow-lg px-2.5 py-2 pointer-events-none"
          >
            <p className="text-[10px] font-semibold text-white leading-tight mb-0.5">
              {workflow.name}
            </p>
            <p className="text-[9.5px] text-[hsl(0_0%_72%)] leading-snug">
              {workflow.description}
            </p>
            <p className="text-[9px] text-[hsl(0_0%_50%)] mt-1">Unlocks after launch</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export const PipelineCanvas = memo(function PipelineCanvas({
  completedSteps,
  currentStep,
  configuredData = {},
  activeStepSkillIds,
  onChipClick,
}: PipelineCanvasProps) {
  const [lockedExpanded, setLockedExpanded] = useState(false)
  const lockedCount = LOCKED_WORKFLOWS.length

  return (
    <div className="flex flex-col h-full overflow-hidden text-[hsl(0_0%_7%)]">
      {/* header */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[hsl(240_4%_52%)]">
          Active Pipeline
        </p>
      </div>

      {/* active workflow rows */}
      <div className="flex-1 min-h-0 overflow-y-auto border-t border-[hsl(240_6%_90%)]">
        {ACTIVE_WORKFLOWS.map((wf, i) => (
          <ActiveWorkflowRow
            key={wf.id}
            workflow={wf}
            completedSteps={completedSteps}
            currentStep={currentStep}
            activeStepSkillIds={activeStepSkillIds}
            onChipClick={onChipClick}
            isLast={i === ACTIVE_WORKFLOWS.length - 1}
          />
        ))}
      </div>

      {/* locked workflows — expandable */}
      {lockedCount > 0 && (
        <div className="shrink-0 border-t border-[hsl(240_6%_90%)]">
          <button
            type="button"
            onClick={() => setLockedExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-[hsl(240_5%_97%)] transition-colors"
          >
            <span className="text-[9px] text-[hsl(240_4%_52%)] font-medium">
              + {lockedCount} more workflows
            </span>
            {lockedExpanded
              ? <ChevronUp className="h-3 w-3 text-[hsl(240_4%_52%)]" />
              : <ChevronDown className="h-3 w-3 text-[hsl(240_4%_52%)]" />
            }
          </button>

          <AnimatePresence>
            {lockedExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {LOCKED_WORKFLOWS.map((wf) => (
                  <LockedWorkflowRow key={wf.id} workflow={wf} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
})

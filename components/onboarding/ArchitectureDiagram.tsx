"use client"

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import type { Step1 } from "@/lib/schema"

type SkillDef = typeof SKILL_DEFS[number]

// ─── node data ────────────────────────────────────────────────────────────────

type AgentNodeData = {
  kind: "orchestrator" | "stream-agent"
  label: string
  streamId?: string
  active: boolean
  enriched: boolean
  onClickNode: (id: string) => void
}

// Step → which stream agents are "in focus"
const STEP_FOCUS: Record<number, string[]> = {
  0: ["SEO", "AEO/GEO", "Paid"],
  1: ["SEO", "AEO/GEO", "Paid"],
  2: ["AEO/GEO"],
  3: ["AEO/GEO", "Paid"],
  4: ["AEO/GEO"],
  5: ["SEO", "AEO/GEO"],
  6: ["SEO", "AEO/GEO"],
  7: ["SEO", "AEO/GEO", "Paid"],
  8: ["SEO", "AEO/GEO", "Paid"],
}

// ─── custom node ─────────────────────────────────────────────────────────────

function AgentNode({ id, data }: NodeProps) {
  const d = data as AgentNodeData
  const handleClick = useCallback(() => d.onClickNode(id), [d, id])

  if (d.kind === "orchestrator") {
    return (
      <>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 shadow-sm transition-all cursor-pointer",
            d.active
              ? "bg-violet-100 border-violet-300 hover:shadow-md"
              : "bg-muted/30 border-border/40 opacity-40 grayscale",
          )}
        >
          <span className="text-lg">🤖</span>
          <div className="text-left">
            <p className="text-[12px] font-semibold text-violet-800 leading-tight">{d.label}</p>
            <p className="text-[9px] text-violet-500 font-mono">SOUL.md · orchestrator</p>
          </div>
        </button>
      </>
    )
  }

  const streamColors: Record<string, { active: string; dim: string }> = {
    SEO:      { active: "border-blue-300 bg-blue-50 text-blue-800",       dim: "border-border/30 bg-muted/20 text-muted-foreground/40" },
    "AEO/GEO":{ active: "border-emerald-300 bg-emerald-50 text-emerald-800", dim: "border-border/30 bg-muted/20 text-muted-foreground/40" },
    Paid:     { active: "border-amber-300 bg-amber-50 text-amber-800",     dim: "border-border/30 bg-muted/20 text-muted-foreground/40" },
  }
  const streamIcons: Record<string, string> = {
    SEO: "🔍", "AEO/GEO": "📡", Paid: "💰",
  }

  const colors = streamColors[d.streamId ?? ""] ?? streamColors["SEO"]
  const colorClass = d.active ? colors.active : colors.dim

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 shadow-sm transition-all cursor-pointer",
          d.active ? "hover:shadow-md" : "cursor-default grayscale",
          colorClass,
        )}
      >
        <span className="text-base">{streamIcons[d.streamId ?? ""] ?? "⚙️"}</span>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold leading-tight">{d.label}</p>
            {d.enriched && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </div>
          <p className="text-[9px] font-mono opacity-60">{d.streamId}</p>
        </div>
      </button>
    </>
  )
}

const nodeTypes = { agentNode: AgentNode }

// ─── node / edge builders ─────────────────────────────────────────────────────

const STREAM_AGENTS = [
  { id: "seo-agent",  label: "SEO Agent",     streamId: "SEO",      x: 20  },
  { id: "aeo-agent",  label: "AEO/GEO Agent", streamId: "AEO/GEO",  x: 200 },
  { id: "paid-agent", label: "Paid Agent",    streamId: "Paid",     x: 380 },
]

// Which step enriches which stream agent
const STREAM_ENRICHED_BY: Record<string, number[]> = {
  SEO:      [5, 6],
  "AEO/GEO":[4, 5, 6],
  Paid:     [3, 5],
}

function buildNodes(
  agentName: string,
  activeStreams: string[],
  currentStep: number,
  completedSteps: number[],
  onClickNode: (id: string) => void,
): Node[] {
  const focusStreams = STEP_FOCUS[currentStep] ?? STREAM_AGENTS.map((a) => a.streamId)

  const nodes: Node[] = [
    {
      id: "orchestrator",
      type: "agentNode",
      position: { x: 190, y: 10 },
      data: {
        kind: "orchestrator",
        label: agentName || "Orchestrator",
        active: true,
        enriched: completedSteps.length > 0,
        onClickNode,
      },
    },
  ]

  for (const ag of STREAM_AGENTS) {
    const isActiveStream = activeStreams.length === 0 || activeStreams.includes(ag.streamId)
    const isFocused = focusStreams.includes(ag.streamId)
    const enrichSteps = STREAM_ENRICHED_BY[ag.streamId] ?? []
    const isEnriched = enrichSteps.some((s) => completedSteps.includes(s))

    nodes.push({
      id: ag.id,
      type: "agentNode",
      position: { x: ag.x, y: 120 },
      data: {
        kind: "stream-agent",
        label: ag.label,
        streamId: ag.streamId,
        active: isActiveStream && isFocused,
        enriched: isEnriched,
        onClickNode,
      },
    })
  }

  return nodes
}

function buildEdges(activeStreams: string[], currentStep: number): Edge[] {
  const focusStreams = STEP_FOCUS[currentStep] ?? STREAM_AGENTS.map((a) => a.streamId)

  return STREAM_AGENTS.map((ag) => {
    const isActive =
      (activeStreams.length === 0 || activeStreams.includes(ag.streamId)) &&
      focusStreams.includes(ag.streamId)
    return {
      id: `e-orch-${ag.id}`,
      source: "orchestrator",
      target: ag.id,
      type: "smoothstep",
      animated: isActive,
      style: {
        strokeWidth: isActive ? 1.5 : 1,
        stroke: isActive ? "#a1a1aa" : "#e4e4e7",
        opacity: isActive ? 1 : 0.35,
      },
    }
  })
}

// ─── component ────────────────────────────────────────────────────────────────

export function ArchitectureDiagram({
  activeSkills: _activeSkills,
  agentName,
  streamsSelected,
  currentStep = 1,
  completedSteps = [],
  onEditSkill,
  onEditAgent,
}: {
  activeSkills: SkillDef[]
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
  currentStep?: number
  completedSteps?: number[]
  onEditSkill: (skillId: string) => void
  onEditAgent: (agentId: string) => void
}) {
  const activeStreams = (streamsSelected ?? []) as string[]

  const handleClickNode = useCallback(
    (id: string) => {
      const isSkill = SKILL_DEFS.some((s) => s.id === id)
      if (isSkill) onEditSkill(id)
      else onEditAgent(id)
    },
    [onEditSkill, onEditAgent],
  )

  const nodes = useMemo(
    () => buildNodes(agentName ?? "Orchestrator", activeStreams, currentStep, completedSteps, handleClickNode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentName, activeStreams, currentStep, completedSteps],
  )

  const edges = useMemo(
    () => buildEdges(activeStreams, currentStep),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStreams, currentStep],
  )

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e4e4e7" gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

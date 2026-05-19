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
import { SKILL_COLORS } from "./SkillCard"
import type { Step1 } from "@/lib/schema"

type SkillDef = typeof SKILL_DEFS[number]

// ─── node data ────────────────────────────────────────────────────────────────

type AgentNodeData = {
  kind: "orchestrator" | "stream-agent" | "skill-chip"
  label: string
  icon: string
  streamId?: string
  skillId?: string
  onClickNode: (id: string) => void
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-100 border-2 border-violet-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <span className="text-lg">{d.icon}</span>
          <div className="text-left">
            <p className="text-[12px] font-semibold text-violet-800 leading-tight">{d.label}</p>
            <p className="text-[9px] text-violet-500 font-mono">SOUL.md · orchestrator</p>
          </div>
        </button>
      </>
    )
  }

  const streamColors: Record<string, string> = {
    SEO:      "border-blue-300 bg-blue-50 text-blue-800",
    "AEO/GEO":"border-emerald-300 bg-emerald-50 text-emerald-800",
    Paid:     "border-amber-300 bg-amber-50 text-amber-800",
  }
  const colorClass = streamColors[d.streamId ?? ""] ?? "border-border bg-white text-foreground"

  if (d.kind === "stream-agent") {
    return (
      <>
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
            colorClass,
          )}
        >
          <span className="text-base">{d.icon}</span>
          <div className="text-left">
            <p className="text-[11px] font-semibold leading-tight">{d.label}</p>
            <p className="text-[9px] font-mono opacity-60">{d.streamId}</p>
          </div>
        </button>
      </>
    )
  }

  // skill-chip
  const skillColor = SKILL_COLORS[d.skillId ?? ""] ?? SKILL_COLORS["keyword-research"]
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-left hover:shadow-sm transition-shadow cursor-pointer",
          skillColor.bg, skillColor.border,
        )}
      >
        <span className="text-sm">{d.icon}</span>
        <p className={cn("text-[10px] font-medium truncate max-w-[90px]", skillColor.countText)}>
          {d.label}
        </p>
      </button>
    </>
  )
}

const nodeTypes = { agentNode: AgentNode }

// ─── node / edge builders ─────────────────────────────────────────────────────

const STREAM_AGENTS = [
  { id: "seo-agent",  label: "SEO Agent",     icon: "🔍", streamId: "SEO",      x: 20 },
  { id: "aeo-agent",  label: "AEO/GEO Agent", icon: "📡", streamId: "AEO/GEO",  x: 200 },
  { id: "paid-agent", label: "Paid Agent",    icon: "💰", streamId: "Paid",     x: 380 },
]

function buildNodes(
  activeSkills: SkillDef[],
  agentName: string,
  onClickNode: (id: string) => void,
): Node[] {
  const nodes: Node[] = [
    {
      id: "orchestrator",
      type: "agentNode",
      position: { x: 190, y: 10 },
      data: { kind: "orchestrator", label: agentName || "Orchestrator", icon: "🤖", onClickNode },
    },
  ]

  // Stream agent nodes
  for (const ag of STREAM_AGENTS) {
    nodes.push({
      id: ag.id,
      type: "agentNode",
      position: { x: ag.x, y: 120 },
      data: { kind: "stream-agent", label: ag.label, icon: ag.icon, streamId: ag.streamId, onClickNode },
    })
  }

  // Skill chip nodes — grouped under each stream agent
  const byStream: Record<string, SkillDef[]> = { SEO: [], "AEO/GEO": [], Paid: [] }
  for (const skill of activeSkills) {
    const primary = skill.streams[0] as string
    if (primary in byStream) byStream[primary].push(skill)
  }

  for (const ag of STREAM_AGENTS) {
    const skills = byStream[ag.streamId] ?? []
    skills.forEach((skill, i) => {
      nodes.push({
        id: skill.id,
        type: "agentNode",
        position: { x: ag.x - 20 + i * 115, y: 240 + Math.floor(i / 1) * 0 },
        data: { kind: "skill-chip", label: skill.label, icon: skill.icon, skillId: skill.id, onClickNode },
      })
    })
  }

  return nodes
}

function buildEdges(activeSkills: SkillDef[]): Edge[] {
  const edges: Edge[] = []
  for (const ag of STREAM_AGENTS) {
    edges.push({
      id: `e-orch-${ag.id}`,
      source: "orchestrator",
      target: ag.id,
      type: "smoothstep",
      animated: true,
      style: { strokeWidth: 1.5, stroke: "#a1a1aa" },
    })
  }

  const byStream: Record<string, SkillDef[]> = { SEO: [], "AEO/GEO": [], Paid: [] }
  for (const skill of activeSkills) {
    const primary = skill.streams[0] as string
    if (primary in byStream) byStream[primary].push(skill)
  }

  for (const ag of STREAM_AGENTS) {
    for (const skill of byStream[ag.streamId] ?? []) {
      edges.push({
        id: `e-${ag.id}-${skill.id}`,
        source: ag.id,
        target: skill.id,
        type: "smoothstep",
        style: { strokeWidth: 1, stroke: "#d4d4d8" },
      })
    }
  }

  return edges
}

// ─── component ────────────────────────────────────────────────────────────────

export function ArchitectureDiagram({
  activeSkills,
  agentName,
  onEditSkill,
  onEditAgent,
}: {
  activeSkills: SkillDef[]
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
  onEditSkill: (skillId: string) => void
  onEditAgent: (agentId: string) => void
}) {
  const handleClickNode = useCallback(
    (id: string) => {
      const isSkill = SKILL_DEFS.some((s) => s.id === id)
      if (isSkill) onEditSkill(id)
      else onEditAgent(id)
    },
    [onEditSkill, onEditAgent],
  )

  const nodes = useMemo(
    () => buildNodes(activeSkills, agentName ?? "Orchestrator", handleClickNode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSkills, agentName],
  )

  const edges = useMemo(() => buildEdges(activeSkills), [activeSkills])

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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

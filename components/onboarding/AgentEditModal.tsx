"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/cn"
import { AGENT_DOCS } from "@/lib/agent-defaults"

type AgentId = "orchestrator" | "seo-agent" | "aeo-agent" | "paid-agent"

const AGENT_META: Record<AgentId, { label: string; icon: string; color: string }> = {
  orchestrator: { label: "Orchestrator",  icon: "🤖", color: "bg-violet-50 border-violet-200" },
  "seo-agent":  { label: "SEO Agent",     icon: "🔍", color: "bg-blue-50 border-blue-200"   },
  "aeo-agent":  { label: "AEO/GEO Agent", icon: "📡", color: "bg-emerald-50 border-emerald-200" },
  "paid-agent": { label: "Paid Agent",    icon: "💰", color: "bg-amber-50 border-amber-200"  },
}

export function AgentEditModal({
  agentId,
  soulContent,
  onSaveSoul,
  onClose,
}: {
  agentId: string | null
  soulContent: string
  onSaveSoul: (v: string) => void
  onClose: () => void
}) {
  const [draftSoul, setDraftSoul] = useState(soulContent)
  const [saved, setSaved] = useState(false)

  const isOrchestrator = agentId === "orchestrator"
  const meta = AGENT_META[agentId as AgentId]

  // Sync draft when soulContent prop changes externally
  useEffect(() => { setDraftSoul(soulContent) }, [soulContent])

  // Escape key
  useEffect(() => {
    if (!agentId) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [agentId, onClose])

  const handleSave = () => {
    onSaveSoul(draftSoul)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!agentId || !meta || typeof document === "undefined") return null

  const agentDoc = AGENT_DOCS[agentId as keyof typeof AGENT_DOCS]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-border flex flex-col max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-border", meta.color)}>
          <span className="h-9 w-9 rounded-lg flex items-center justify-center text-xl bg-white/70 border border-white/80 shrink-0">
            {meta.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-foreground">{meta.label}</p>
            <p className="text-[11px] text-muted-foreground/70">
              {isOrchestrator ? "SOUL.md · Editable" : "Agent doc · Read-only preview"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {isOrchestrator ? (
            /* Orchestrator — SOUL.md editable */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/60">
                  SOUL.md
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-mono">
                  editable
                </span>
              </div>
              <textarea
                value={draftSoul}
                onChange={(e) => setDraftSoul(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-[12px] font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground/50">
                SOUL.md defines the orchestrator's purpose, constraints, and decision principles.
              </p>
            </div>
          ) : (
            /* Stream agent — read-only doc */
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
                {agentDoc?.title ?? meta.label} · agent doc
              </p>
              <div className={cn(
                "prose prose-sm max-w-none text-[12px]",
                "[&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:mb-1 [&_h1]:mt-0",
                "[&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-muted-foreground/60 [&_h2]:mb-1.5 [&_h2]:mt-3",
                "[&_p]:text-[12px] [&_p]:text-foreground/70 [&_p]:my-1",
                "[&_ul]:my-1 [&_li]:text-[12px] [&_li]:text-foreground/70 [&_li]:my-0.5",
                "[&_strong]:font-semibold [&_strong]:text-foreground/80",
              )}>
                <ReactMarkdown>{agentDoc?.content ?? `# ${meta.label}\n\nNo agent doc yet.`}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isOrchestrator && (
          <div className="border-t border-border px-4 py-3 bg-white/80 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground/50">
              Changes apply to all orchestrator decisions
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={draftSoul === soulContent}
              className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 transition-opacity"
            >
              {saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

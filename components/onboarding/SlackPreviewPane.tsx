"use client"

import { cn } from "@/lib/cn"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface DimScore {
  label: string
  score: number
  weight: number
}

interface SlackPreviewPaneProps {
  agentName?: string
  topic?: string
  /** Caption shown below the preview — contextualises the example */
  caption?: string
  className?: string
}

const WAYGROUND_EXAMPLE: {
  topic: string
  totalScore: number
  dims: DimScore[]
  excerpt: string
} = {
  topic: "How AI is changing B2B SaaS buying decisions in 2025",
  totalScore: 8.4,
  dims: [
    { label: "QAPE Structure",  score: 9,   weight: 25 },
    { label: "EAR Coverage",    score: 8,   weight: 25 },
    { label: "Extractability",  score: 9,   weight: 20 },
    { label: "Trust Signals",   score: 7,   weight: 20 },
    { label: "Intent Match",    score: 9,   weight: 10 },
  ],
  excerpt: "AI buying committees now involve 7–11 stakeholders across ops, finance, and legal. Content that reaches all of them — at different knowledge levels — wins.",
}

function ScoreDot({ score }: { score: number }) {
  const color =
    score >= 8 ? "bg-emerald-500" :
    score >= 6 ? "bg-amber-400" :
    "bg-red-400"
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", color)} />
}

export function SlackPreviewPane({
  agentName = "Waymark",
  topic,
  caption,
  className,
}: SlackPreviewPaneProps) {
  const ex = WAYGROUND_EXAMPLE
  const displayTopic = topic ?? ex.topic
  const passed = ex.totalScore >= 7.0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Slack chrome */}
      <div className="rounded-lg border border-[#1a1d21]/10 bg-[#1a1d21] overflow-hidden text-white">
        {/* Slack titlebar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[10px] text-white/30 font-mono ml-1"># waymark-approvals</span>
        </div>

        {/* Message */}
        <div className="px-3 py-3">
          {/* Bot header */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-7 w-7 rounded-md bg-violet-500 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <div>
              <span className="text-[12px] font-semibold text-white">{agentName}</span>
              <span className="text-[9px] text-white/30 ml-1.5">APP</span>
              <span className="text-[9px] text-white/30 ml-2">Today at 10:41 AM</span>
            </div>
          </div>

          {/* Message body */}
          <div className="rounded-md border-l-[3px] border-violet-400 pl-3 pr-2 py-2 bg-white/5">
            <p className="text-[11px] font-semibold text-white mb-0.5">
              {passed ? "✅ D-gate PASS" : "🔄 D-gate REVISE"} — review ready
            </p>
            <p className="text-[11px] text-white/70 leading-relaxed mb-2">
              {displayTopic}
            </p>

            {/* Score summary */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className={cn(
                "text-[13px] font-bold",
                passed ? "text-emerald-400" : "text-amber-400",
              )}>
                {ex.totalScore.toFixed(1)}/10
              </span>
              <span className="text-[9px] text-white/30">
                ({passed ? `↑ ${(ex.totalScore - 7.0).toFixed(1)} above threshold` : "below 7.0 threshold"})
              </span>
            </div>

            {/* Dimension breakdown */}
            <div className="flex flex-col gap-1.5 mb-3 bg-white/5 rounded-md p-2">
              {ex.dims.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <ScoreDot score={d.score} />
                  <span className="text-[10px] text-white/60 flex-1 truncate">{d.label}</span>
                  <span className="text-[10px] font-mono text-white/40 w-6 text-right">{d.weight}%</span>
                  <span className="text-[10px] font-semibold text-white w-8 text-right">{d.score}/10</span>
                </div>
              ))}
            </div>

            {/* Excerpt */}
            <p className="text-[10px] text-white/40 italic leading-relaxed border-t border-white/10 pt-2 mb-3">
              "{ex.excerpt}"
            </p>

            {/* CTA buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 transition-colors text-[11px] font-semibold text-white"
              >
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition-colors text-[11px] font-medium text-white/80"
              >
                <AlertCircle className="h-3 w-3" />
                Request revision
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-[10px] text-muted-foreground/50 text-center px-2 leading-relaxed">
          {caption}
        </p>
      )}
    </div>
  )
}

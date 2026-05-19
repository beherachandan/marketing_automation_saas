"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type AuditBlock =
  | { type: "header"; text: { type: "plain_text"; text: string } }
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "divider" }

type AuditResponse = {
  ok: boolean
  summary?: string
  blocks?: AuditBlock[]
  scores?: Record<string, number>
  totalScore?: number
  passed?: boolean
  verdict?: string
  source?: "live" | "stub"
  error?: string
}

type Turn = {
  id: string
  kind: "user" | "bot"
  botName?: string
  text?: string
  result?: AuditResponse
  at: string
}

function now() {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function SlackSandbox({ botName, channelName }: { botName: string; channelName: string }) {
  const [url, setUrl] = useState("https://www.anthropic.com/claude")
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!url.trim() || loading) return
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      kind: "user",
      text: `@${botName} audit ${url.trim()}`,
      at: now(),
    }
    setTurns((t) => [...t, userTurn])
    setLoading(true)
    try {
      const res = await fetch("/api/audit/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data: AuditResponse = await res.json()
      setTurns((t) => [...t, { id: crypto.randomUUID(), kind: "bot", botName, result: data, at: now() }])
    } catch (e) {
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          kind: "bot",
          botName,
          result: { ok: false, error: e instanceof Error ? e.message : "Request failed" },
          at: now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex h-5 items-center rounded bg-secondary px-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            sandbox
          </span>
          Try the audit loop
        </CardTitle>
        <CardDescription>
          Simulated Slack thread — hit Send to run a real <code className="font-mono">/audit</code> against the URL. No OAuth required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-[#1d1c1d] text-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[12px] text-white/70">
            <span className="text-white">#</span>
            <span className="font-semibold text-white">{channelName}</span>
            <span className="text-white/40">· sandbox</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4 flex flex-col gap-3">
            {turns.length === 0 && (
              <p className="text-[12px] text-white/50 italic">
                Thread will appear here. Try: <code className="font-mono text-white/80">@{botName} audit {url}</code>
              </p>
            )}
            {turns.map((t) => (
              <SlackTurn key={t.id} turn={t} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[12px] text-white/60">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/40" />
                {botName} is typing…
              </div>
            )}
          </div>
          <div className="border-t border-white/10 p-3 flex gap-2 items-start">
            <span className="text-white/50 font-mono text-[13px] pt-1.5">@{botName} audit</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="https://example.com/page"
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !url.trim()}
              className="rounded bg-[#007a5a] hover:bg-[#148567] disabled:opacity-40 px-4 py-1.5 text-[13px] font-semibold"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SlackTurn({ turn }: { turn: Turn }) {
  const avatarBg = turn.kind === "user" ? "bg-fuchsia-500" : "bg-[#007a5a]"
  const name = turn.kind === "user" ? "you" : turn.botName
  const nameBadge = turn.kind === "bot" ? (
    <span className="inline-flex h-4 items-center rounded bg-white/10 px-1 text-[9px] font-mono uppercase text-white/70">
      APP
    </span>
  ) : null
  return (
    <div className="flex gap-2">
      <div className={`h-8 w-8 shrink-0 rounded ${avatarBg} flex items-center justify-center text-[12px] font-semibold`}>
        {name?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold">{name}</span>
          {nameBadge}
          <span className="text-white/40">{turn.at}</span>
        </div>
        {turn.text && <p className="text-[13px] whitespace-pre-wrap mt-0.5">{turn.text}</p>}
        {turn.result && <BotResult result={turn.result} />}
      </div>
    </div>
  )
}

function BotResult({ result }: { result: AuditResponse }) {
  if (!result.ok) {
    return (
      <div className="mt-1 rounded border-l-2 border-red-500/70 bg-red-500/10 px-3 py-2 text-[13px]">
        <span className="font-semibold text-red-300">Error:</span> {result.error ?? "Unknown error"}
      </div>
    )
  }
  const passed = result.passed
  return (
    <div className="mt-1 rounded border-l-2 border-white/20 bg-white/5 overflow-hidden">
      {result.source === "stub" && (
        <div className="px-3 pt-2 text-[10px] font-mono uppercase tracking-wide text-yellow-400/80">
          demo · stubbed response (no Anthropic key)
        </div>
      )}
      <div className="px-3 py-2 border-b border-white/10">
        <div className={`text-[14px] font-semibold ${passed ? "text-green-400" : "text-yellow-300"}`}>
          {passed ? "✅ PASS" : "⚠️ REVISE"} — {(result.totalScore ?? 0).toFixed(1)}/10
        </div>
        <p className="text-[12px] text-white/70 mt-0.5">{result.verdict}</p>
      </div>
      {result.scores && Object.keys(result.scores).length > 0 && (
        <div className="px-3 py-2 text-[12px]">
          <p className="text-white/60 mb-1 font-semibold">Scores</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1">
            {Object.entries(result.scores).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-white/70 truncate">{k}</span>
                <span className="font-mono tabular-nums">{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.summary && result.blocks && (
        <details className="px-3 py-2 text-[12px] border-t border-white/10">
          <summary className="cursor-pointer text-white/60 hover:text-white/80">Raw Slack blocks</summary>
          <pre className="mt-2 text-[11px] text-white/60 overflow-auto">{JSON.stringify(result.blocks, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}

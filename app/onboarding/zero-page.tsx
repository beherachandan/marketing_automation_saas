"use client"

import { useState } from "react"
import type { Step1, ScannedHints } from "@/lib/schema"
import { SetupForm } from "./setup-form"
import { ZeroHero } from "@/components/onboarding/ZeroHero"

interface ZeroPageProps {
  initial: {
    workspace: string
    website: string
    streams: Step1["agent"]["streams"]
  }
  scannedHints?: ScannedHints | null
}

// Thin shell — shares live stream + website state between left form and right hero
export function ZeroPage({ initial, scannedHints }: ZeroPageProps) {
  const [liveStreams, setLiveStreams] = useState<Step1["agent"]["streams"]>(
    initial.streams.length > 0 ? initial.streams : ["AEO/GEO"],
  )
  const [liveWebsite, setLiveWebsite] = useState(initial.website)

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: form (~55%) ─────────────────────────────────────── */}
      <div className="flex-[55] flex flex-col min-h-screen border-r border-border">
        {/* top bar */}
        <div className="px-10 pt-8 pb-0 flex items-center gap-3">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Conduct</span>
          <span className="text-[11px] text-muted-foreground font-mono">/ setup</span>
        </div>

        {/* form content */}
        <div className="flex-1 px-10 pt-10 pb-12 flex flex-col max-w-[540px]">
          {/* heading */}
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground mb-2">
              Step 0 of 8
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight leading-tight text-foreground mb-3">
              Set up your AI<br />marketing engine
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Enter your website and pick your workstreams. Your agent builds from there.
            </p>
          </div>

          <SetupForm
            initial={initial}
            scannedHints={scannedHints}
            onStreamsChange={setLiveStreams}
            onWebsiteChange={setLiveWebsite}
          />
        </div>
      </div>

      {/* ── Right: animated hero (~45%) ───────────────────────────── */}
      <div className="flex-[45] bg-surface flex flex-col overflow-auto">
        <div className="sticky top-0 px-8 pt-8">
          <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground mb-6">
            Your agent preview
          </p>
          <ZeroHero streams={liveStreams} website={liveWebsite} />
        </div>
      </div>
    </div>
  )
}

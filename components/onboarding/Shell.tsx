"use client"

import { createContext, useContext, useState } from "react"
import { ProgressRail } from "./ProgressRail"
import { ActivityPane } from "./ActivityPane"
import type { FileEntry } from "./PreviewPane"
import type { Step1 } from "@/lib/schema"

// Live stream selection context — lets the zero screen push selections to ActivityPane in real-time
type StreamContextValue = {
  liveStreams: Step1["agent"]["streams"] | undefined
  setLiveStreams: (s: Step1["agent"]["streams"]) => void
  selectedSkillId: string | null
  setSelectedSkillId: (id: string | null) => void
}

export const StreamContext = createContext<StreamContextValue>({
  liveStreams: undefined,
  setLiveStreams: () => {},
  selectedSkillId: null,
  setSelectedSkillId: () => {},
})

export function useStreamContext() {
  return useContext(StreamContext)
}

export function Shell({
  children,
  files,
  completedSteps,
  currentStep,
  agentName,
  streamsSelected,
}: {
  children: React.ReactNode
  files: FileEntry[]
  completedSteps: number[]
  currentStep: number
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
}) {
  // liveStreams starts from persisted value; zero screen overrides it live without a round-trip
  const [liveStreams, setLiveStreams] = useState<Step1["agent"]["streams"] | undefined>(streamsSelected)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const effectiveStreams = liveStreams ?? streamsSelected

  return (
    <StreamContext.Provider value={{ liveStreams, setLiveStreams, selectedSkillId, setSelectedSkillId }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Rail — 180px, minimal step list */}
        <ProgressRail completedSteps={completedSteps} />

        {/* Center — form area, constrained width, centered */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 border-r border-border">
          <div className="flex-1 overflow-auto">
            <div className="min-h-full flex flex-col items-center justify-start px-8 py-10">
              <div className="w-full max-w-[480px]">
                {children}
              </div>
            </div>
          </div>
        </main>

        {/* Live Graph — 460px+, hero panel */}
        <ActivityPane
          files={files}
          completedSteps={completedSteps}
          currentStep={currentStep}
          agentName={agentName}
          streamsSelected={effectiveStreams}
        />
      </div>
    </StreamContext.Provider>
  )
}

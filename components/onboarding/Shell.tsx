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
      <div className="flex h-screen overflow-hidden">
        <ProgressRail completedSteps={completedSteps} />
        <main className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
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

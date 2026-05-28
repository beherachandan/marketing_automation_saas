import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { loadOnboardingState } from "@/lib/persist"
import { isDevBypass } from "@/lib/persist-local"
import {
  toIdentityMd,
  toUserMd,
  toProductContextMd,
  toBrandVoiceMd,
  toAeoGuidelinesMd,
  toAeoScoringRubricMd,
  toTrendSeedsJson,
  toToolsMd,
  toWebflowIdsMd,
  toTenantJson,
} from "@/lib/file-generators"
import { ShellGate } from "@/components/onboarding/ShellGate"
import type { FileEntry } from "@/components/onboarding/PreviewPane"
import type { OnboardingState } from "@/lib/schema"
import type { PipelineConfiguredData } from "@/components/onboarding/PipelineCanvas"

export const dynamic = "force-dynamic"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!isDevBypass()) {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect("/auth/sign-in")
  }

  const state = await loadOnboardingState()
  const files = partialFiles(state)
  const configuredData = buildConfiguredData(state)

  return (
    <ShellGate
      files={files}
      completedSteps={state.completedSteps ?? []}
      agentName={state.step1?.agent?.name}
      streamsSelected={state.step1?.agent?.streams}
      configuredData={configuredData}
    >
      {children}
    </ShellGate>
  )
}

function buildConfiguredData(s: Partial<OnboardingState>): PipelineConfiguredData {
  return {
    agentName: s.step1?.agent?.name,
    streams: s.step1?.agent?.streams as string[] | undefined,
    productName: s.step2?.product?.name,
    icpRoles: s.step3?.icps?.map((i) => i.role),
    toneLabel: s.step4?.attributes?.[0],
    formalCasual: s.step4?.tone?.formalCasual,
    passThreshold: s.step5?.passThreshold,
    seedLabel: s.step6?.seeds?.[0],
    slackChannel: s.step7?.slack?.channelName,
    cmsProvider: s.step7?.cms?.provider,
  }
}

function partialFiles(s: Partial<OnboardingState>): FileEntry[] {
  const out: FileEntry[] = []
  if (s.step1) {
    out.push({ path: "IDENTITY.md", content: toIdentityMd(s.step1), steps: [1] })
    out.push({ path: "USER.md", content: toUserMd(s.step1), steps: [1] })
  }
  if (s.step2 && s.step3) {
    out.push({
      path: "aeo/context/product-context.md",
      content: toProductContextMd(s.step2, s.step3),
      steps: [2, 3],
    })
  }
  if (s.step4) {
    out.push({
      path: "aeo/context/brand-voice-guide.md",
      content: toBrandVoiceMd(s.step4),
      steps: [4],
    })
  }
  if (s.step5) {
    out.push({
      path: "aeo/context/aeo-guidelines.md",
      content: toAeoGuidelinesMd(s.step5),
      steps: [5],
    })
    out.push({
      path: "aeo/context/aeo-scoring-rubric.md",
      content: toAeoScoringRubricMd(s.step5),
      steps: [5],
    })
  }
  if (s.step6) {
    out.push({
      path: "skills/trends-researcher/scripts/trend-seeds.json",
      content: toTrendSeedsJson(s.step6),
      steps: [6],
    })
  }
  if (s.step7) {
    out.push({ path: "TOOLS.md", content: toToolsMd(s.step7), steps: [7] })
    out.push({
      path: "skills/F1-webflow-publisher/references/webflow-ids.md",
      content: toWebflowIdsMd(s.step7),
      steps: [7],
    })
    out.push({ path: "config/tenant.json", content: toTenantJson(s.step7), steps: [7] })
  }
  return out
}

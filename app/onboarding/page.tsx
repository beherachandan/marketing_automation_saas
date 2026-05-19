import { loadOnboardingState } from "@/lib/persist"
import { ZeroPage } from "./zero-page"

export const dynamic = "force-dynamic"

export default async function OnboardingZeroPage() {
  const state = await loadOnboardingState()
  return (
    <ZeroPage
      initial={{
        workspace: state.step1?.workspace ?? "",
        website: state.step1?.website ?? "",
        streams: state.step1?.agent?.streams ?? ["AEO/GEO"],
      }}
      scannedHints={state.scannedHints ?? null}
    />
  )
}

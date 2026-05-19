"use server"

import { revalidatePath } from "next/cache"
import {
  saveStep as saveStepRaw,
  finalizeOnboarding as finalizeRaw,
  saveScannedHints,
  loadOnboardingState,
} from "@/lib/persist"
import { scanWebsite, scanWebsiteDeep } from "@/lib/website-scanner"
import type { ScannedHints, Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8 } from "@/lib/schema"

export async function saveStep1(data: Step1) {
  await saveStepRaw(1, data)
  revalidatePath("/onboarding", "layout")
}

export async function scanWebsiteAction(url: string): Promise<ScannedHints> {
  const hints = await scanWebsite(url)
  await saveScannedHints(hints)
  revalidatePath("/onboarding", "layout")
  return hints
}

export async function discoverProductLinesAction(url: string): Promise<ScannedHints> {
  const hints = await scanWebsiteDeep(url)
  await saveScannedHints(hints)
  revalidatePath("/onboarding", "layout")
  return hints
}

export async function saveSelectedProductLines(slugs: string[]): Promise<ScannedHints | null> {
  const state = await loadOnboardingState()
  const hints = state.scannedHints
  if (!hints) return null
  const next: ScannedHints = { ...hints, selectedProductSlugs: slugs }
  await saveScannedHints(next)
  revalidatePath("/onboarding", "layout")
  return next
}
export async function saveStep2(data: Step2) {
  await saveStepRaw(2, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep3(data: Step3) {
  await saveStepRaw(3, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep4(data: Step4) {
  await saveStepRaw(4, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep5(data: Step5) {
  await saveStepRaw(5, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep6(data: Step6) {
  await saveStepRaw(6, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep7(data: Step7) {
  await saveStepRaw(7, data)
  revalidatePath("/onboarding", "layout")
}
export async function saveStep8(data: Step8) {
  await saveStepRaw(8, data)
  revalidatePath("/onboarding", "layout")
}

export async function finalizeOnboardingAction() {
  await finalizeRaw()
  revalidatePath("/", "layout")
}

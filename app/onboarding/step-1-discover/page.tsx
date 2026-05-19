import { redirect } from "next/navigation"

// Deprecated — workspace + scan moved to /onboarding (zero screen)
export default function Step1DiscoverPage() {
  redirect("/onboarding")
}

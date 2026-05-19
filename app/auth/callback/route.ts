import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isDevBypass } from "@/lib/persist-local"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as "magiclink" | "email" | null
  const next = url.searchParams.get("next") ?? "/onboarding/step-1"
  const errorDesc = url.searchParams.get("error_description")

  if (errorDesc) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(errorDesc)}`, req.url),
    )
  }

  if (isDevBypass()) return NextResponse.redirect(new URL(next, req.url))

  const supabase = await getSupabaseServerClient()

  async function afterSignIn(): Promise<NextResponse> {
    // On first magic-link sign-in the user has no password — prompt to set one
    const { data: { user } } = await supabase.auth.getUser()
    const hasPassword = user?.user_metadata?.has_password === true
    if (user && !hasPassword) {
      return NextResponse.redirect(
        new URL(`/auth/set-password?next=${encodeURIComponent(next)}`, req.url),
      )
    }
    return NextResponse.redirect(new URL(next, req.url))
  }

  // token_hash flow — works cross-browser, no PKCE verifier needed
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, req.url),
      )
    }
    return afterSignIn()
  }

  // PKCE code flow — same-browser only
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // PKCE verifier missing (different browser) — redirect to manual OTP entry
      if (error.message.includes("code verifier") || error.message.includes("invalid_grant")) {
        return NextResponse.redirect(
          new URL(`/auth/verify?next=${encodeURIComponent(next)}`, req.url),
        )
      }
      return NextResponse.redirect(
        new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, req.url),
      )
    }
    return afterSignIn()
  }

  return NextResponse.redirect(
    new URL(`/auth/sign-in?error=${encodeURIComponent("Missing auth code")}`, req.url),
  )
}

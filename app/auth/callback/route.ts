import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isDevBypass } from "@/lib/persist-local"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/onboarding/step-1"
  const errorDesc = url.searchParams.get("error_description")

  if (errorDesc) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(errorDesc)}`, req.url),
    )
  }

  if (isDevBypass()) return NextResponse.redirect(new URL(next, req.url))

  if (!code) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent("Missing auth code")}`, req.url),
    )
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, req.url),
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Callback failed"
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(msg)}`, req.url),
    )
  }

  return NextResponse.redirect(new URL(next, req.url))
}

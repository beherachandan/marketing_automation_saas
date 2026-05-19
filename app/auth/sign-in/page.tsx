import Link from "next/link"
import { isDevBypass } from "@/lib/persist-local"
import { SignInForm } from "./form"

export const dynamic = "force-dynamic"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>
}) {
  const { error, sent, next } = await searchParams
  const devBypass = isDevBypass()
  const nextPath = next ?? "/onboarding/step-1"

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* ── left: brand hero ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-col justify-between w-[480px] shrink-0 px-12 py-12 relative overflow-hidden"
        style={{ background: "hsl(var(--activity-bg))", color: "hsl(var(--activity-text))" }}
      >
        {/* logo */}
        <div>
          <span className="text-[13px] font-semibold tracking-tight text-white/90">Conduct</span>
          <span className="ml-2 text-[11px] font-mono text-white/30">by you</span>
        </div>

        {/* headline */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight text-white">
              Your AEO content engine,<br />configured in 8 steps.
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-white/60">
              From your website domain to a fully trained Slack bot — brand-aware, rubric-scored, and auto-publishing.
            </p>
          </div>

          {/* feature list */}
          <ul className="space-y-3">
            {[
              { icon: "🤖", label: "AI agent trained on your brand voice & ICPs" },
              { icon: "📊", label: "9-dimension AEO rubric, auto-calibrated" },
              { icon: "💬", label: "Slack-native: /audit and /draft from any channel" },
              { icon: "🔄", label: "4 automated crons: discovery, citation, re-score" },
            ].map(({ icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-[13px] text-white/70">
                <span className="shrink-0 mt-0.5">{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* mock audit card */}
          <div
            className="rounded-lg p-4 text-[12px] font-mono"
            style={{ background: "hsl(var(--activity-border))", border: "1px solid hsl(var(--activity-border))" }}
          >
            <p className="text-white/40 mb-2">@conduct audit https://yoursite.com</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded bg-brand-500/30 text-brand-200">8.4 / 10</span>
              <span className="text-green-400">✓ Passed</span>
            </div>
            <p className="text-white/50">Verdict: Strong authority signals, cite primary sources</p>
          </div>
        </div>

        <p className="text-[11px] text-white/25">© 2026 Conduct. No password required.</p>

        {/* decorative gradient orb */}
        <div
          className="absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(var(--brand-500) / 0.15)" }}
        />
      </div>

      {/* ── right: sign-in form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[360px]">
          {/* mobile logo */}
          <div className="md:hidden mb-8">
            <span className="text-[15px] font-semibold tracking-tight">Conduct</span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight mb-1">
            {sent === "1" ? "Check your inbox" : "Get started"}
          </h2>
          <p className="text-muted-foreground text-[13px] mb-6">
            {sent === "1"
              ? "We sent a magic link to your email. Click it to continue."
              : "Enter your work email — we'll send a magic link. No password needed."}
          </p>

          {devBypass && (
            <div className="mb-5 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[12px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-yellow-700 mb-1">dev bypass active</p>
              <p className="text-foreground/80">
                Auth is disabled.{" "}
                <Link href={{ pathname: nextPath }} className="underline">
                  Jump into onboarding →
                </Link>
              </p>
            </div>
          )}

          {sent === "1" && (
            <div className="mb-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-[13px] text-success">
              ✓ Magic link sent — check your email.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {decodeURIComponent(error)}
            </div>
          )}

          <SignInForm next={nextPath} />

          <p className="mt-6 text-[12px] text-muted-foreground leading-relaxed">
            By continuing you agree to the terms. Workspaces are scoped to your email domain.
          </p>
        </div>
      </div>
    </main>
  )
}

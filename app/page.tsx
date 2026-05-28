import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full px-6 py-16">
        <p className="label-uppercase mb-4">Waymark</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          A GEO content engine that runs inside your Slack.
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Capture your brand, product, and ICP context in seven minutes. Then run
          <code className="mx-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px]">/audit</code>
          and
          <code className="mx-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px]">/draft</code>
          from any channel.
        </p>
        <div className="flex gap-3">
          <Link
            href="/onboarding"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            Start onboarding
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 hover:bg-secondary transition"
          >
            Continue session
          </Link>
        </div>
      </div>
    </main>
  )
}

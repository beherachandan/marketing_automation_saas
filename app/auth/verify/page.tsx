import { VerifyForm } from "./form"

export const dynamic = "force-dynamic"

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  const nextPath = next ?? "/onboarding/step-1"

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <span className="text-[15px] font-semibold tracking-tight">Waymark</span>
        </div>

        <h2 className="text-xl font-semibold tracking-tight mb-1">Verify your email</h2>
        <p className="text-muted-foreground text-[13px] mb-6">
          It looks like the magic link was opened in a different browser. Enter your email and the
          6-digit code from that email to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {decodeURIComponent(error)}
          </div>
        )}

        <VerifyForm next={nextPath} />
      </div>
    </main>
  )
}

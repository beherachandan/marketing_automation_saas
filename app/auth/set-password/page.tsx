import { SetPasswordForm } from "./form"

export const dynamic = "force-dynamic"

export default function SetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <span className="text-[15px] font-semibold tracking-tight">Waymark</span>
        </div>

        <h2 className="text-xl font-semibold tracking-tight mb-1">Set a password</h2>
        <p className="text-muted-foreground text-[13px] mb-6">
          Optional but recommended — makes signing in faster next time. You can always use a magic
          link instead.
        </p>

        <SetPasswordForm />
      </div>
    </main>
  )
}

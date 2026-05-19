"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { sendMagicLink, signInWithPassword } from "./actions"

export function SignInForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"magic" | "password">("magic")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Enter a valid email")
      return
    }

    if (mode === "password") {
      if (!password) { setErr("Enter your password"); return }
      start(async () => {
        const res = await signInWithPassword(email.trim(), password)
        if (res.ok) router.push(next as never)
        else setErr(res.error)
      })
      return
    }

    start(async () => {
      const res = await sendMagicLink(email.trim(), next)
      if (res.ok) router.push(`/auth/sign-in?sent=1&next=${encodeURIComponent(next)}`)
      else setErr(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" suppressHydrationWarning>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-foreground">
          Work email <span className="text-destructive">*</span>
        </label>
        <input
          type="email"
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {mode === "password" && (
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-foreground">Password</label>
          <input
            type="password"
            autoFocus
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {err && <p className="text-[12px] text-destructive">{err}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending
          ? mode === "password" ? "Signing in…" : "Sending…"
          : mode === "password" ? "Sign in" : "Send magic link"}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === "magic" ? "password" : "magic"); setErr(null) }}
        className="text-center text-[12px] text-muted-foreground hover:text-foreground"
      >
        {mode === "magic" ? "Sign in with password instead" : "Send me a magic link instead"}
      </button>
    </form>
  )
}

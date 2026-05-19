"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { verifyOtp } from "./actions"

export function VerifyForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Enter a valid email"); return }
    if (token.length !== 6) { setErr("Enter the 6-digit code from your email"); return }
    start(async () => {
      const res = await verifyOtp(email.trim(), token.trim(), next)
      if (res.ok) router.push(next as never)
      else setErr(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-foreground">Email</label>
        <input
          type="email"
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-foreground">6-digit code</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          className="h-10 rounded-md border border-border bg-background px-3 text-[13px] tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">Check the magic link email — the code appears near the bottom.</p>
      </div>
      {err && (
        <p className="text-[12px] text-destructive">{err}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Verifying…" : "Verify and continue"}
      </button>
      <a href="/auth/sign-in" className="text-center text-[12px] text-muted-foreground hover:text-foreground">
        Request a new magic link
      </a>
    </form>
  )
}

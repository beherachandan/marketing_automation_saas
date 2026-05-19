"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setPassword } from "./actions"

export function SetPasswordForm() {
  const router = useRouter()
  const [password, setPasswordValue] = useState("")
  const [confirm, setConfirm] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) { setErr("Password must be at least 8 characters"); return }
    if (password !== confirm) { setErr("Passwords don't match"); return }
    start(async () => {
      const res = await setPassword(password)
      if (res.ok) router.push("/onboarding/step-1")
      else setErr(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-foreground">New password</label>
        <input
          type="password"
          autoFocus
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-foreground">Confirm password</label>
        <input
          type="password"
          placeholder="Repeat password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {err && <p className="text-[12px] text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Set password and continue"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/onboarding/step-1")}
        className="text-center text-[12px] text-muted-foreground hover:text-foreground"
      >
        Skip for now
      </button>
    </form>
  )
}

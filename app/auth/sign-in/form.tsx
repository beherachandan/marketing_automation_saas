"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input, Label, FieldError } from "@/components/ui/input"
import { sendMagicLink } from "./actions"

export function SignInForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Enter a valid email")
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
      <div>
        <Label required>Work email</Label>
        <Input
          type="email"
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FieldError message={err ?? undefined} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  )
}

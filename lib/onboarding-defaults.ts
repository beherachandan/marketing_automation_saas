import type { ScannedHints, Step2, Step3, Step4, Step6, ProductLine } from "@/lib/schema"

export function selectedProductLines(hints: ScannedHints | null | undefined): ProductLine[] {
  if (!hints?.productLines?.length) return []
  const slugs = hints.selectedProductSlugs ?? []
  if (slugs.length === 0) return hints.productLines
  const set = new Set(slugs)
  return hints.productLines.filter((p) => set.has(p.slug))
}

function padTo(min: number, text: string, filler: string): string {
  if (text.length >= min) return text
  return (text + " " + filler).trim().slice(0, Math.max(min, text.length))
}

export function buildStep2Defaults(hints: ScannedHints | null | undefined): Step2 | null {
  const lines = selectedProductLines(hints)
  if (!hints || lines.length === 0) return null

  const primary = lines[0]
  const name = primary.name || hints.suggestedProduct?.name || hints.title || "Product"
  const category =
    primary.category || hints.suggestedProduct?.category || "B2B SaaS"

  const oneLinerRaw =
    primary.summary ||
    hints.suggestedProduct?.oneLiner ||
    hints.description ||
    `${name} — modern solution for your team.`
  const oneLiner = oneLinerRaw.trim().slice(0, 160)
  const oneLinerPadded = oneLiner.length >= 10 ? oneLiner : padTo(10, oneLiner, category)

  const longBits: string[] = []
  if (primary.summary) longBits.push(primary.summary)
  if (hints.description && hints.description !== primary.summary) longBits.push(hints.description)
  if (primary.features?.length) {
    const feats = primary.features
      .slice(0, 4)
      .map((f) => `${f.title}${f.description && f.description !== f.title ? ` — ${f.description}` : ""}`)
    longBits.push(`Key capabilities: ${feats.join("; ")}.`)
  }
  if (lines.length > 1) {
    longBits.push(`Related offerings: ${lines.slice(1).map((l) => l.name).join(", ")}.`)
  }
  const longDescription = padTo(
    50,
    longBits.join(" ").trim(),
    `${name} helps teams automate and scale their work.`,
  ).slice(0, 4000)

  const features =
    primary.features?.length > 0
      ? primary.features.slice(0, 10).map((f) => ({
          title: f.title.slice(0, 80),
          description: (f.description || f.title).slice(0, 400),
        }))
      : [{ title: "Core capability", description: "Describe what this product does for the user." }]

  const positioningRaw = `${name} is the ${category.toLowerCase()} for teams who need ${oneLiner || "modern workflows"}. We focus on ${lines.map((l) => l.name).join(", ")}.`
  const positioning = padTo(20, positioningRaw.slice(0, 2000), `It delivers measurable outcomes for ${category} teams.`).slice(0, 2000)

  return {
    product: {
      name: name.slice(0, 64),
      category: category.slice(0, 64),
      oneLiner: oneLinerPadded,
      longDescription,
      features,
      positioning,
    },
  }
}

export function buildStep3Defaults(hints: ScannedHints | null | undefined): Step3 | null {
  const lines = selectedProductLines(hints)
  const pool: Array<{ name: string; role: string; industry: string }> = []
  for (const l of lines) for (const i of l.suggestedIcps ?? []) pool.push(i)
  for (const i of hints?.suggestedIcps ?? []) pool.push(i)
  const dedup: typeof pool = []
  const seen = new Set<string>()
  for (const p of pool) {
    const k = `${p.name}|${p.role}|${p.industry}`.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(p)
  }
  if (dedup.length === 0) return null
  return {
    icps: dedup.slice(0, 3).map((i) => ({
      name: i.name.slice(0, 64),
      role: i.role.slice(0, 128),
      industry: i.industry.slice(0, 128),
      pains: ["Manual, repetitive work eats up their week."],
      goals: ["Ship more, faster, with fewer handoffs."],
      jobsToBeDone: `Help ${i.role} at ${i.industry} companies do their job with less friction and better outcomes.`,
    })),
  }
}

export function buildStep4Defaults(hints: ScannedHints | null | undefined): Step4 | null {
  const bv = hints?.suggestedBrandVoice
  if (!bv?.tone) return null
  const goodExample = bv.goodExample && bv.goodExample.length >= 20
    ? bv.goodExample.slice(0, 2000)
    : `${hints?.title ?? "Our product"} — ${hints?.description ?? "built for teams who care about craft"}.`.slice(0, 2000)
  return {
    tone: bv.tone,
    attributes: (bv.attributes ?? []).slice(0, 5),
    hardRules: [
      "Never invent statistics — always cite a source.",
      "No pronouns like 'you' in headlines; keep them declarative.",
    ],
    forbiddenWords: "leverage, synergy, revolutionary",
    examples: {
      good: goodExample.length >= 20 ? goodExample : goodExample + " " + "Clear, concrete, grounded in outcomes.",
      bad: "We leverage cutting-edge synergies to revolutionize your workflow with best-in-class solutions.",
    },
  }
}

export function buildStep6Defaults(hints: ScannedHints | null | undefined): Step6 | null {
  const seeds = (hints?.suggestedSeeds ?? []).map((s) => s.slice(0, 120))
  if (seeds.length < 5) return null
  return { seeds: seeds.slice(0, 25) }
}

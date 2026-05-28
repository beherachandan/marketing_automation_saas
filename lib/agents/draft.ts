import { loadTenantContext, buildSystemPreamble } from "./context"
import { complete } from "./anthropic"

type DraftResult = {
  summary: string
  blocks: unknown[]
  title: string
  body: string
  raw: string
}

/**
 * /draft — generate a ~800-word article draft using tenant context.
 */
export async function runDraft(workspaceId: string, topic: string): Promise<DraftResult> {
  const { state, files } = await loadTenantContext(workspaceId)

  const primaryIcp = state.step3.icps[0]
  const system = [
    buildSystemPreamble(files),
    ``,
    `You are the content writer. Produce ONE article draft on the given topic, written for the primary ICP.`,
    `Targets:`,
    `- Length: 700–900 words`,
    `- Structure: follow the articleStructure policy exactly`,
    `- Citations: follow the citationPolicy — include at least 2 outbound source links in markdown`,
    `- Voice: strictly match the brand voice sliders and attributes; never use any forbidden word`,
    `Return the draft as markdown. Start with a single H1 title line (# Title), then body.`,
    `Do not wrap in code fences. Do not add commentary.`,
  ].join("\n")

  const user = [
    `Topic: ${topic}`,
    `Primary ICP: ${primaryIcp.name} — ${primaryIcp.role} in ${primaryIcp.industry}`,
    `Primary ICP pains: ${primaryIcp.pains.join("; ")}`,
    `Primary ICP goals: ${primaryIcp.goals.join("; ")}`,
  ].join("\n")

  const raw = await complete({ system, user, maxTokens: 3500, temperature: 0.55 })

  const { title, body } = splitTitleBody(raw)
  const wordCount = body.split(/\s+/).filter(Boolean).length
  const summary = `✍️ Draft ready — *${title}* (${wordCount} words)`

  const blocks = [
    { type: "header", text: { type: "plain_text", text: title.slice(0, 140) || "Draft" } },
    { type: "context", elements: [{ type: "mrkdwn", text: `${wordCount} words · draft posted by Waymark` }] },
    { type: "divider" },
    ...chunkForBlocks(body).map((chunk) => ({
      type: "section",
      text: { type: "mrkdwn", text: chunk },
    })),
  ]

  return { summary, blocks, title, body, raw }
}

function splitTitleBody(raw: string): { title: string; body: string } {
  const trimmed = raw.trim()
  const firstLine = trimmed.split("\n", 1)[0] ?? ""
  if (firstLine.startsWith("# ")) {
    return {
      title: firstLine.replace(/^#\s+/, "").trim(),
      body: trimmed.slice(firstLine.length).trim(),
    }
  }
  return { title: "Untitled draft", body: trimmed }
}

/**
 * Slack section block text caps at 3000 chars. Break the body into chunks.
 */
function chunkForBlocks(body: string, max = 2800): string[] {
  const chunks: string[] = []
  let remaining = body
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n\n", max)
    if (cut < max / 2) cut = remaining.lastIndexOf("\n", max)
    if (cut < max / 2) cut = max
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

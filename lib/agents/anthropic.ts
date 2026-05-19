import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export function getAnthropic() {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")
  client = new Anthropic({
    apiKey,
    ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
  })
  return client
}

export const MODEL_OPUS = "claude-opus-4-7"
export const MODEL_SONNET = "claude-sonnet-4-6"

export async function complete(opts: {
  system: string
  user: string
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const resp = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SONNET,
    max_tokens: opts.maxTokens ?? 3000,
    temperature: opts.temperature ?? 0.3,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  })
  const text = resp.content
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n")
    .trim()
  return text
}

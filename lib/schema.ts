import { z } from "zod"

export const streamEnum = z.enum(["SEO", "AEO", "GEO", "Paid"])

export const step1Schema = z.object({
  workspace: z.string().min(2).max(64),
  agent: z.object({
    name: z.string().min(1).max(64),
    role: z.string().min(1).max(128),
    streams: z.array(streamEnum).min(1),
  }),
  user: z.object({
    name: z.string().min(1).max(128),
    email: z.string().email(),
    timezone: z.string().min(1),
  }),
})

export const featureSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
})

export const step2Schema = z.object({
  product: z.object({
    name: z.string().min(1).max(64),
    category: z.string().min(1).max(64),
    oneLiner: z.string().min(10).max(160),
    longDescription: z.string().min(50).max(4000),
    features: z.array(featureSchema).min(1).max(20),
    positioning: z.string().min(20).max(2000),
  }),
})

export const icpSchema = z.object({
  name: z.string().min(1).max(64),
  role: z.string().min(1).max(128),
  industry: z.string().min(1).max(128),
  pains: z.array(z.string().min(1).max(280)).min(1).max(10),
  goals: z.array(z.string().min(1).max(280)).min(1).max(10),
  jobsToBeDone: z.string().min(10).max(2000),
})

export const step3Schema = z.object({
  icps: z.array(icpSchema).min(1).max(10),
})

const toneAxis = z.number().min(0).max(100)

export const step4Schema = z.object({
  tone: z.object({
    formalCasual: toneAxis,
    authoritativeFriendly: toneAxis,
    technicalConversational: toneAxis,
    playfulSerious: toneAxis,
  }),
  attributes: z.array(z.string().min(1).max(32)).max(5),
  hardRules: z.array(z.string().min(1).max(280)).max(20),
  forbiddenWords: z.string().max(2000).default(""),
  examples: z.object({
    good: z.string().min(20).max(2000),
    bad: z.string().min(20).max(2000),
  }),
})

export const step5Schema = z.object({
  guidelines: z.object({
    articleStructure: z.string().min(10).max(2000),
    urlFormat: z.string().min(1).max(200),
    headingPolicy: z.string().min(10).max(800),
    citationPolicy: z.string().min(10).max(800),
  }),
  rubric: z
    .object({
      structure: z.number().int().min(0).max(100),
      factuality: z.number().int().min(0).max(100),
      citation: z.number().int().min(0).max(100),
      clarity: z.number().int().min(0).max(100),
      intent: z.number().int().min(0).max(100),
      brandAlignment: z.number().int().min(0).max(100),
      icpFit: z.number().int().min(0).max(100),
      freshness: z.number().int().min(0).max(100),
      uniqueness: z.number().int().min(0).max(100),
    })
    .refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, {
      message: "Rubric weights must sum to 100",
    }),
  passThreshold: z.number().min(5).max(10).default(7.0),
})

export const step6Schema = z.object({
  seeds: z.array(z.string().min(2).max(120)).min(5).max(50),
})

const connectionStatus = z.enum(["connected", "stub", "none"]).default("none")

export const step7Schema = z.object({
  slack: z.object({
    installed: z.boolean().default(false),
    teamId: z.string().optional(),
    channelId: z.string().optional(),
    channelName: z.string().optional(),
  }),
  semrush: z.object({
    apiKey: z.string().optional(),
    status: connectionStatus,
  }),
  dataforseo: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    status: connectionStatus,
  }),
  tavily: z.object({
    apiKey: z.string().optional(),
    status: connectionStatus,
  }),
  cms: z.object({
    provider: z.enum(["webflow", "wordpress", "contentful", "sanity", "none"]).default("none"),
    siteId: z.string().optional(),
    token: z.string().optional(),
    collectionMap: z.record(z.string(), z.string()).default({}),
    status: connectionStatus,
  }),
  gemini: z.object({ apiKey: z.string().optional() }).optional(),
})

export const step8Schema = z.object({
  host: z.object({
    mode: z.enum(["managed", "byo"]).default("managed"),
    byoHost: z.string().optional(),
  }),
  crons: z.object({
    eodMemory: z.boolean().default(true),
    weeklyDiscovery: z.boolean().default(true),
    monthlyCitation: z.boolean().default(false),
    monthlyRubric: z.boolean().default(false),
  }),
})

export const onboardingSchema = z.object({
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
  step5: step5Schema,
  step6: step6Schema,
  step7: step7Schema,
  step8: step8Schema,
})

export type Step1 = z.infer<typeof step1Schema>
export type Step2 = z.infer<typeof step2Schema>
export type Step3 = z.infer<typeof step3Schema>
export type Step4 = z.infer<typeof step4Schema>
export type Step5 = z.infer<typeof step5Schema>
export type Step6 = z.infer<typeof step6Schema>
export type Step7 = z.infer<typeof step7Schema>
export type Step8 = z.infer<typeof step8Schema>
export type OnboardingState = z.infer<typeof onboardingSchema>

export const rubricDefaults: Step5["rubric"] = {
  structure: 12,
  factuality: 15,
  citation: 12,
  clarity: 10,
  intent: 12,
  brandAlignment: 12,
  icpFit: 12,
  freshness: 8,
  uniqueness: 7,
}

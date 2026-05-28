import { describe, it, expect } from "vitest"
import {
  ONBOARDING_ANNOTATIONS,
  step1Annotations,
  step2Annotations,
  step3Annotations,
  step4Annotations,
  step5Annotations,
  step6Annotations,
  step7Annotations,
} from "@/lib/onboarding-annotations"

describe("ONBOARDING_ANNOTATIONS master map", () => {
  it("contains entries for steps 1–7", () => {
    for (let i = 1; i <= 7; i++) {
      expect(ONBOARDING_ANNOTATIONS[i]).toBeDefined()
    }
  })

  it("has no entry for step 8 (launch step has no field annotations)", () => {
    expect(ONBOARDING_ANNOTATIONS[8]).toBeUndefined()
  })
})

describe("step1Annotations", () => {
  it("every annotation has required fields", () => {
    for (const [key, card] of Object.entries(step1Annotations)) {
      expect(card.agentLabel, `${key}.agentLabel`).toBeTruthy()
      expect(card.agentRole, `${key}.agentRole`).toBeTruthy()
      expect(card.actionCopy, `${key}.actionCopy`).toBeTruthy()
    }
  })

  it("workspace annotation names O1 as primary agent", () => {
    expect(step1Annotations.workspace.agentLabel).toContain("B3")
  })

  it("website annotation names A1 as primary agent", () => {
    expect(step1Annotations.website.agentLabel).toContain("A1")
  })

  it("agent.name annotation names O1 Pipeline Manager", () => {
    expect(step1Annotations["agent.name"].agentLabel).toContain("O1")
  })
})

describe("step2Annotations", () => {
  it("product.name, product.category, product.oneLiner, product.longDescription, features, product.positioning are all present", () => {
    const required = ["product.name", "product.category", "product.oneLiner", "product.longDescription", "features", "product.positioning"]
    for (const key of required) {
      expect(step2Annotations[key], `step2Annotations["${key}"]`).toBeDefined()
    }
  })
})

describe("step3Annotations", () => {
  it("all ICP sub-fields are annotated", () => {
    const required = ["icps[].name", "icps[].role", "icps[].industry", "icps[].painPoints", "icps[].goals", "icps[].jtbd"]
    for (const key of required) {
      expect(step3Annotations[key], `step3Annotations["${key}"]`).toBeDefined()
    }
  })
})

describe("step4Annotations", () => {
  it("all tone axes are annotated", () => {
    const toneAxes = ["tone.formalCasual", "tone.authoritativeFriendly", "tone.technicalConversational", "tone.playfulSerious"]
    for (const key of toneAxes) {
      expect(step4Annotations[key], `step4Annotations["${key}"]`).toBeDefined()
    }
  })

  it("hardRules annotation references D4", () => {
    expect(step4Annotations.hardRules.agentLabel).toContain("D4")
  })

  it("forbiddenWords is a two-gate system (D4 primary, C3 secondary)", () => {
    const ann = step4Annotations.forbiddenWords
    expect(ann.agentLabel).toContain("D4")
    expect(ann.secondaryAgents?.some((a) => a.includes("C3"))).toBe(true)
  })
})

describe("step5Annotations", () => {
  it("all 5 canonical AEO dimensions are annotated", () => {
    const dims = ["rubric.qape_structure", "rubric.ear_coverage", "rubric.extractability", "rubric.trust_signals", "rubric.intent_match"]
    for (const key of dims) {
      expect(step5Annotations[key], `step5Annotations["${key}"]`).toBeDefined()
    }
  })

  it("all 5 dimensions reference D1 AEO Scorer as primary agent", () => {
    const dims = ["rubric.qape_structure", "rubric.ear_coverage", "rubric.extractability", "rubric.trust_signals", "rubric.intent_match"]
    for (const key of dims) {
      expect(step5Annotations[key].agentLabel).toContain("D1")
    }
  })

  it("passThreshold annotation references O1 Pipeline Manager", () => {
    expect(step5Annotations.passThreshold.agentLabel).toContain("O1")
  })
})

describe("step6Annotations", () => {
  it("seeds annotation is present and references A1 as primary", () => {
    expect(step6Annotations.seeds).toBeDefined()
    expect(step6Annotations.seeds.agentLabel).toContain("A1")
  })

  it("seeds annotation mentions multiple secondary agents", () => {
    expect(step6Annotations.seeds.secondaryAgents?.length).toBeGreaterThanOrEqual(2)
  })
})

describe("step7Annotations", () => {
  it("Slack channel, Slack workspace, bot name, CMS site ID are annotated", () => {
    const required = ["slack.workspace", "slack.channelId", "slack.botName", "cms.siteId"]
    for (const key of required) {
      expect(step7Annotations[key], `step7Annotations["${key}"]`).toBeDefined()
    }
  })
})

describe("annotation copy quality", () => {
  it("no annotation actionCopy contains generic filler phrases", () => {
    const filler = ["helps the agent", "improves quality", "calibrates the system", "your product name here"]
    for (const [step, annotations] of Object.entries(ONBOARDING_ANNOTATIONS)) {
      for (const [key, card] of Object.entries(annotations)) {
        for (const phrase of filler) {
          expect(card.actionCopy.toLowerCase(), `step ${step} "${key}" actionCopy contains filler: "${phrase}"`).not.toContain(phrase.toLowerCase())
        }
      }
    }
  })

  it("no annotation actionCopy is longer than 300 characters", () => {
    for (const [step, annotations] of Object.entries(ONBOARDING_ANNOTATIONS)) {
      for (const [key, card] of Object.entries(annotations)) {
        expect(card.actionCopy.length, `step ${step} "${key}" actionCopy too long`).toBeLessThanOrEqual(300)
      }
    }
  })
})

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseScoringResponse, scoringErrorResponse, ScoringError, toScoringError } from "../lib/scoring-parse.ts"

const criterion = (score: unknown) => ({
  score,
  strengths: ["Clear position"],
  areas_for_improvement: ["Thin examples"],
  suggestions: ["Add a specific example"],
  examples: [],
})

const validResponse = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    overall_band: 6.5,
    summary: "  A competent answer.  ",
    criteria: { TR: criterion(6.5), CC: criterion(7), LR: criterion(6), GRA: criterion(6.5) },
    action_plan: ["Plan paragraphs", "", 42],
    line_level_feedback: [
      { start_index: 0, end_index: 10, category: "grammar", comment: "Tense", suggested_rewrite: "has made" },
      { start_index: "x", category: "nonsense", comment: 5 },
    ],
    ...overrides,
  })

const badOutput = (fn: () => unknown) =>
  assert.throws(fn, (e: unknown) => e instanceof ScoringError && e.kind === "BAD_OUTPUT")

describe("parseScoringResponse", () => {
  it("maps a complete response onto TaskFeedback", () => {
    const fb = parseScoringResponse(validResponse())
    assert.equal(fb.overallBand, 6.5)
    assert.equal(fb.summary, "A competent answer.")
    assert.equal(fb.criteria.CC.score, 7)
    assert.deepEqual(fb.criteria.TR.issues, ["Thin examples"], "areas_for_improvement becomes issues")
    assert.deepEqual(fb.actionItems, ["Plan paragraphs"], "blank and non-string items are dropped")
  })

  it("rounds bands to the nearest half", () => {
    assert.equal(parseScoringResponse(validResponse({ overall_band: 6.7 })).overallBand, 6.5)
    assert.equal(parseScoringResponse(validResponse({ overall_band: "7.8" })).overallBand, 8)
  })

  it("never leaves undefined in line-level feedback (Firestore rejects it)", () => {
    const [ok, junk] = parseScoringResponse(validResponse()).lineLevelFeedback!
    assert.deepEqual(ok, { startIndex: 0, endIndex: 10, category: "grammar", comment: "Tense", suggestedRewrite: "has made" })
    assert.deepEqual(junk, { startIndex: 0, endIndex: 0, category: "grammar", comment: "", suggestedRewrite: "" })
    for (const value of Object.values(junk)) assert.notEqual(value, undefined)
  })

  // Regression: the old fallback invented a band from any digit in the text, e.g. "Task 2"
  it("refuses output that is not JSON instead of inventing a score", () => {
    badOutput(() => parseScoringResponse("Overall this Task 2 essay deserves a 6."))
    badOutput(() => parseScoringResponse('{"overall_band": 6.5, "criteria": {"TR"'))
  })

  it("refuses missing or out-of-range scores", () => {
    badOutput(() => parseScoringResponse(validResponse({ overall_band: 10 })))
    badOutput(() => parseScoringResponse(validResponse({ overall_band: null })))
    badOutput(() => parseScoringResponse(validResponse({ criteria: { TR: criterion(6), CC: criterion(6), LR: criterion(6) } })))
    badOutput(() => parseScoringResponse(validResponse({ criteria: { TR: criterion("high"), CC: criterion(6), LR: criterion(6), GRA: criterion(6) } })))
  })
})

describe("scoring errors", () => {
  it("classifies quota and rate-limit failures", () => {
    assert.equal(toScoringError({ status: 429 }).kind, "RATE_LIMIT")
    assert.equal(toScoringError(new Error("RESOURCE_EXHAUSTED: quota exceeded")).kind, "RATE_LIMIT")
    assert.equal(toScoringError(new Error("socket hang up")).kind, "GENERIC")
  })

  it("maps each kind to an HTTP status", async () => {
    assert.equal(scoringErrorResponse(new ScoringError("x", "RATE_LIMIT")).status, 429)
    const bad = scoringErrorResponse(new ScoringError("Cut off.", "BAD_OUTPUT"))
    assert.equal(bad.status, 502)
    assert.equal((await bad.json()).errorType, "BAD_OUTPUT")
    assert.equal(scoringErrorResponse(new Error("boom")).status, 500)
  })
})

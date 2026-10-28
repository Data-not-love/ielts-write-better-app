import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { applyCorrections, segmentByFeedback, usableFeedback } from "../lib/feedback-text.ts"
import type { LineLevelFeedback } from "../types/tasks.ts"

const essay = "Technology have changed life. It is good. Cats are cute."
//             0         1         2         3         4         5
//             0123456789012345678901234567890123456789012345678901234

const fb = (startIndex: number, endIndex: number, extra: Partial<LineLevelFeedback> = {}): LineLevelFeedback => ({
  startIndex,
  endIndex,
  category: "grammar",
  comment: "",
  suggestedRewrite: "",
  ...extra,
})

describe("usableFeedback", () => {
  it("drops out-of-range and empty spans and sorts by position", () => {
    const items = [fb(30, 41), fb(-1, 5), fb(10, 10), fb(0, 999), fb(0, 15)]
    assert.deepEqual(usableFeedback(essay, items).map((f) => f.startIndex), [0, 30])
  })

  it("keeps the earliest of overlapping spans", () => {
    const outer = fb(0, 29, { category: "task_response" })
    const inner = fb(11, 15)
    assert.deepEqual(usableFeedback(essay, [inner, outer]), [outer])
  })
})

describe("segmentByFeedback", () => {
  it("covers the whole essay exactly once", () => {
    const segments = segmentByFeedback(essay, [fb(11, 15), fb(30, 41), fb(12, 20)])
    assert.equal(segments.map((s) => s.text).join(""), essay, "overlap must not duplicate text")
    assert.deepEqual(
      segments.filter((s) => s.feedback).map((s) => s.text),
      ["have", "It is good."],
    )
  })

  it("returns the essay as one plain segment without feedback", () => {
    assert.deepEqual(segmentByFeedback(essay, undefined), [{ text: essay, feedback: null }])
  })
})

describe("applyCorrections", () => {
  it("applies rewrites and removes passages flagged as irrelevant", () => {
    const result = applyCorrections(essay, [
      fb(11, 15, { suggestedRewrite: "has" }),
      fb(42, 56, { comment: "Irrelevant to the prompt and should be removed" }),
    ])
    assert.equal(result, "Technology has changed life. It is good. ")
  })

  it("leaves text alone when there is no rewrite", () => {
    assert.equal(applyCorrections(essay, [fb(0, 10)]), essay)
  })

  it("does not corrupt text when spans overlap", () => {
    const result = applyCorrections(essay, [fb(0, 29, { suggestedRewrite: "Technology has changed life." }), fb(11, 15, { suggestedRewrite: "has" })])
    assert.equal(result, "Technology has changed life. It is good. Cats are cute.")
  })
})

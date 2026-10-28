import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  calculateCurrentOverallAverage,
  calculateFirstSubmissionScores,
  calculateOverallScoreTrend,
  calculateOverallTrendString,
  calculateTaskTypeStats,
  filterTasksByDateRange,
} from "../lib/report-analytics.ts"
import type { TaskDocument } from "../types/tasks.ts"

// Minimal stand-in for a Firestore Timestamp
const daysAgo = (days: number) => {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return { toDate: () => date, toMillis: () => date.getTime() }
}

const criteria = (score: number) =>
  Object.fromEntries(
    (["TR", "CC", "LR", "GRA"] as const).map((k) => [k, { score, strengths: [], issues: [], suggestions: [], examples: [] }]),
  )

const task = (id: string, days: number, overallBand?: number, taskType = "Task 2") =>
  ({
    id,
    taskType,
    createdAt: daysAgo(days),
    ...(overallBand === undefined
      ? { status: "draft" }
      : { status: "scored", overallBand, feedback: { overallBand, summary: "", criteria: criteria(overallBand), actionItems: [] } }),
  }) as unknown as TaskDocument

const tasks = [task("a", 40, 5.5), task("b", 20, 6, "Task 1"), task("c", 3, 7), task("draft", 1)]

describe("report analytics", () => {
  it("filters by date range", () => {
    assert.deepEqual(filterTasksByDateRange(tasks, 30).map((t) => t.id), ["b", "c", "draft"])
    assert.deepEqual(filterTasksByDateRange(tasks, 7).map((t) => t.id), ["c", "draft"])
  })

  it("ignores unscored drafts in averages and stats", () => {
    assert.equal(calculateCurrentOverallAverage(tasks), 6.2)
    const stats = calculateTaskTypeStats(tasks)
    assert.deepEqual(stats.map((s) => [s.taskType, s.count]), [["Task 2", 2], ["Task 1", 1]])
  })

  it("groups the score trend by week from the first task", () => {
    const trend = calculateOverallScoreTrend(tasks)
    assert.equal(trend[0].week, 1)
    assert.equal(trend[0].score, 5.5)
    assert.equal(trend.at(-1)?.score, 7)
    assert.equal(calculateOverallTrendString(trend), "+1.5 since start")
  })

  it("uses the oldest scored task as the baseline", () => {
    assert.deepEqual(calculateFirstSubmissionScores(tasks), { TR: 5.5, CC: 5.5, LR: 5.5, GRA: 5.5 })
    assert.equal(calculateFirstSubmissionScores([task("d", 2)]), null)
  })
})

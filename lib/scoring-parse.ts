import type { CriterionFeedback, CriterionKey, FeedbackCategory, LineLevelFeedback, TaskFeedback } from "@/types/tasks"
// Relative with extension so node --test can load it too
import { errorMessage, isRateLimitError } from "./ai-errors.ts"

/**
 * Pure parsing and error mapping for the scoring pipeline (lib/essay-scoring.ts).
 * Kept free of runtime imports so it can be unit tested with node --test.
 */

export type ScoringErrorKind = "RATE_LIMIT" | "BAD_OUTPUT" | "GENERIC"

export class ScoringError extends Error {
  readonly kind: ScoringErrorKind

  constructor(message: string, kind: ScoringErrorKind) {
    super(message)
    this.kind = kind
  }
}

const CRITERIA: CriterionKey[] = ["TR", "CC", "LR", "GRA"]
const CATEGORIES: FeedbackCategory[] = ["grammar", "lexical", "coherence", "task_response"]

/** Strictly converts the model's JSON into TaskFeedback; throws BAD_OUTPUT instead of guessing. */
export function parseScoringResponse(text: string): TaskFeedback {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ScoringError("AI trả về kết quả không đọc được (có thể bị cắt ngang).", "BAD_OUTPUT")
  }
  if (!isRecord(raw) || !isRecord(raw.criteria)) {
    throw new ScoringError("AI trả về kết quả thiếu điểm theo tiêu chí.", "BAD_OUTPUT")
  }

  const overallBand = toBand(raw.overall_band)
  if (overallBand === null) throw new ScoringError("AI trả về điểm tổng không hợp lệ.", "BAD_OUTPUT")

  const criteria = {} as Record<CriterionKey, CriterionFeedback>
  for (const key of CRITERIA) {
    const c = raw.criteria[key]
    const score = isRecord(c) ? toBand(c.score) : null
    if (!isRecord(c) || score === null) throw new ScoringError(`AI trả về điểm ${key} không hợp lệ.`, "BAD_OUTPUT")
    criteria[key] = {
      score,
      strengths: stringList(c.strengths),
      issues: stringList(c.areas_for_improvement ?? c.issues),
      suggestions: stringList(c.suggestions),
      examples: stringList(c.examples),
    }
  }

  return {
    overallBand,
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim() : "",
    criteria,
    actionItems: stringList(raw.action_plan),
    lineLevelFeedback: lineFeedbackList(raw.line_level_feedback),
  }
}

/** Maps scoring failures to an HTTP response with a message the user can act on. */
export function scoringErrorResponse(error: unknown): Response {
  const e = error instanceof ScoringError ? error : toScoringError(error)
  if (e.kind === "RATE_LIMIT") {
    return Response.json(
      { error: "AI chấm điểm đang vượt giới hạn sử dụng. Vui lòng thử lại sau 1-2 phút.", errorType: "RATE_LIMIT", retryAfter: 120 },
      { status: 429 },
    )
  }
  if (e.kind === "BAD_OUTPUT") {
    return Response.json({ error: `${e.message} Vui lòng bấm chấm lại.`, errorType: "BAD_OUTPUT" }, { status: 502 })
  }
  return Response.json(
    { error: "Không thể chấm điểm bài viết. Vui lòng kiểm tra kết nối và thử lại.", errorType: "GENERIC" },
    { status: 500 },
  )
}

export function toScoringError(error: unknown): ScoringError {
  if (error instanceof ScoringError) return error
  return new ScoringError(errorMessage(error), isRateLimitError(error) ? "RATE_LIMIT" : "GENERIC")
}

// ---------- helpers ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/** A band score: a finite number within 0-9, rounded to the nearest half band. */
function toBand(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 9) return null
  return Math.round(n * 2) / 2
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim()) : []
}

// Firestore rejects undefined, so every field is always a concrete value
function lineFeedbackList(v: unknown): LineLevelFeedback[] {
  if (!Array.isArray(v)) return []
  return v.filter(isRecord).map((item) => {
    const start = Number(item.start_index)
    const end = Number(item.end_index)
    const category = CATEGORIES.includes(item.category as FeedbackCategory) ? (item.category as FeedbackCategory) : "grammar"
    return {
      startIndex: Number.isFinite(start) && start >= 0 ? start : 0,
      endIndex: Number.isFinite(end) && end >= 0 ? end : 0,
      category,
      comment: typeof item.comment === "string" ? item.comment : "",
      suggestedRewrite: typeof item.suggested_rewrite === "string" ? item.suggested_rewrite : "",
    }
  })
}

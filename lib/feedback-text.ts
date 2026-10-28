import type { LineLevelFeedback } from "@/types/tasks"

/**
 * Text helpers for line-level feedback. Pure, so they are unit tested.
 *
 * Model feedback can be out of range or overlap (a grammar slip inside an off-topic
 * sentence). Overlapping items would duplicate text when highlighting and corrupt it
 * when applying rewrites, so only the earliest of any overlapping items is used.
 */

/** In-range items, ordered by position, without overlaps. */
export function usableFeedback(text: string, items: LineLevelFeedback[] | undefined): LineLevelFeedback[] {
  const sorted = (items ?? [])
    .filter((item) => item.startIndex >= 0 && item.endIndex <= text.length && item.startIndex < item.endIndex)
    .sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex)
  const result: LineLevelFeedback[] = []
  let end = 0
  for (const item of sorted) {
    if (item.startIndex < end) continue
    result.push(item)
    end = item.endIndex
  }
  return result
}

export type TextSegment = { text: string; feedback: LineLevelFeedback | null }

/** Splits the essay into plain runs and runs covered by a feedback item, in order. */
export function segmentByFeedback(text: string, items: LineLevelFeedback[] | undefined): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  for (const item of usableFeedback(text, items)) {
    if (item.startIndex > cursor) segments.push({ text: text.slice(cursor, item.startIndex), feedback: null })
    segments.push({ text: text.slice(item.startIndex, item.endIndex), feedback: item })
    cursor = item.endIndex
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), feedback: null })
  return segments
}

const IRRELEVANT_HINTS = ["n/a", "irrelevant to the prompt", "irrelevant to prompt", "should be removed", "does not address the prompt"]

/** True when the feedback says the passage should be cut rather than rewritten. */
export function isIrrelevantFeedback(item: LineLevelFeedback): boolean {
  const comment = item.comment?.toLowerCase() ?? ""
  return IRRELEVANT_HINTS.some((hint) => comment.includes(hint))
}

/** The essay with every suggested rewrite applied and passages flagged as irrelevant removed. */
export function applyCorrections(text: string, items: LineLevelFeedback[] | undefined): string {
  let corrected = text
  // Apply from the end so earlier indices stay valid
  for (const item of [...usableFeedback(text, items)].reverse()) {
    const before = corrected.slice(0, item.startIndex)
    const after = corrected.slice(item.endIndex)
    if (isIrrelevantFeedback(item)) corrected = before + after
    else if (item.suggestedRewrite) corrected = before + item.suggestedRewrite + after
  }
  return corrected
}

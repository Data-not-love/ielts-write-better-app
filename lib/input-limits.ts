/**
 * Size caps for user-supplied text sent to Gemini. Every request costs quota,
 * so oversized or non-string fields are rejected before reaching the model.
 */
export const INPUT_LIMITS = {
  essay: 12_000, // ~2,000 words, well above any IELTS task
  prompt: 2_000,
  text: 5_000,
  short: 200,
  chatMessages: 40,
  chatTotal: 30_000,
} as const

/**
 * Returns an error response for the first field that is not a string or exceeds
 * its limit, or null when every present field is acceptable. Absent fields are skipped.
 */
export function validateTextFields(fields: Record<string, [value: unknown, max: number]>): Response | null {
  for (const [name, [value, max]] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    if (typeof value !== "string") {
      return Response.json({ error: `${name} must be a string` }, { status: 400 })
    }
    if (value.length > max) {
      return Response.json({ error: `${name} is too long (max ${max} characters)` }, { status: 413 })
    }
  }
  return null
}

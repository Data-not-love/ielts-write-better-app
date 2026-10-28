import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { z } from "zod"

export const maxDuration = 60

const grammarSchema = z.object({
  issues: z.array(
    z.object({
      line: z.number(),
      original: z.string(),
      suggested: z.string(),
      rule: z.string(),
      explanation: z.string(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }

    // Use server-side rate limiting to prevent quota exhaustion
    const { object } = await withRateLimit(() =>
      retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: grammarSchema,
            prompt: `Check the following text for grammar, spelling, and style issues suitable for IELTS writing:

"${text}"

Identify all errors and provide:
- Line number (estimate based on sentence position)
- Original incorrect text
- Suggested correction
- Grammar rule violated
- Clear explanation

Focus on: subject-verb agreement, tense consistency, article usage, prepositions, spelling, punctuation, and word choice.`,
            temperature: 0.2,
          }),
        GEMINI_RETRY_CONFIG
      )
    )

    return Response.json({ issues: object.issues })
  } catch (error: any) {
    console.error("[v0] Error checking grammar:", error)
    
    // Check for rate limit / quota errors
    const errorMessage = error?.message || error?.toString() || ""
    const isRateLimitError = 
      error?.status === 429 ||
      error?.response?.status === 429 ||
      errorMessage.toLowerCase().includes("too many requests") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.includes("429")
    
    if (isRateLimitError) {
      return Response.json({ 
        error: "AI kiểm tra ngữ pháp đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return Response.json({ 
      error: "Failed to check grammar",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

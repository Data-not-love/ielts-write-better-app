import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { z } from "zod"

export const maxDuration = 60

const outlineSchema = z.object({
  introduction: z.object({
    hook: z.string(),
    background: z.string(),
    thesis: z.string(),
  }),
  body1: z.object({
    topic: z.string(),
    points: z.array(z.string()),
  }),
  body2: z.object({
    topic: z.string(),
    points: z.array(z.string()),
  }),
  counterArgument: z.object({
    point: z.string(),
    rebuttal: z.string(),
  }),
  conclusion: z.object({
    summary: z.string(),
    finalThought: z.string(),
  }),
})

export async function POST(req: Request) {
  try {
    const { topic, targetBand } = await req.json()

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 })
    }

    // Use server-side rate limiting to prevent quota exhaustion
    const { object } = await withRateLimit(() =>
      retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: outlineSchema,
            prompt: `Create a detailed essay outline for an IELTS Task 2 essay targeting band ${targetBand || "7.0"}.

Topic: "${topic}"

Generate a complete outline with:
1. Introduction (hook, background, thesis statement)
2. Body Paragraph 1 (topic sentence + 3 supporting points)
3. Body Paragraph 2 (topic sentence + 3 supporting points)
4. Counter-argument (opposing view + rebuttal)
5. Conclusion (summary + final thought)

Make it specific to the topic and appropriate for the target band score.`,
            temperature: 0.7,
          }),
        GEMINI_RETRY_CONFIG
      )
    )

    return Response.json({ outline: object })
  } catch (error: any) {
    console.error("[v0] Error generating outline:", error)
    
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
        error: "AI tạo dàn ý đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return Response.json({ 
      error: "Failed to generate outline",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

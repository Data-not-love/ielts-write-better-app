import { guardAiRequest } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { z } from "zod"

export const maxDuration = 60

const paraphraseSchema = z.object({
  paraphrases: z.array(
    z.object({
      text: z.string(),
      style: z.enum(["Concise", "Formal", "Band-up vocab", "Academic", "Expanded"]),
      description: z.string(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { text } = await req.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }

    const invalid = validateTextFields({ text: [text, INPUT_LIMITS.text] })
    if (invalid) return invalid

    // Use server-side rate limiting to prevent quota exhaustion
    const { object } = await withRateLimit(() =>
      retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: paraphraseSchema,
            prompt: `Paraphrase the following text in 5 different styles for IELTS writing:

Original: "${text}"

Provide exactly 5 paraphrases with these styles:
1. Concise - Shorter, more direct
2. Formal - More academic register
3. Band-up vocab - Higher-level vocabulary
4. Academic - Sophisticated academic style
5. Expanded - More detailed expression

Each paraphrase should maintain the original meaning while demonstrating the specified style.`,
            temperature: 0.8,
          }),
        GEMINI_RETRY_CONFIG
      )
    )

    return Response.json({ paraphrases: object.paraphrases })
  } catch (error: any) {
    console.error("[v0] Error generating paraphrases:", error)
    
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
        error: "AI diễn giải đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return Response.json({ 
      error: "Failed to generate paraphrases",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

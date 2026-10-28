import { aiErrorResponse, errorMessage } from "@/lib/ai-errors"
import { guardAiRequest } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
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
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { text } = await req.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }

    const invalid = validateTextFields({ text: [text, INPUT_LIMITS.essay] })
    if (invalid) return invalid

    const { object } = await retryWithBackoff(
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

    return Response.json({ issues: object.issues })
  } catch (error) {
    console.error("Error checking grammar:", errorMessage(error))
    return aiErrorResponse(error, {
      rateLimit: "AI kiểm tra ngữ pháp đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
      generic: "Failed to check grammar",
    })
  }
}

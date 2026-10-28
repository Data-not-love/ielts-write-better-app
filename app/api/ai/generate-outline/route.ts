import { aiErrorResponse, errorMessage } from "@/lib/ai-errors"
import { guardAiRequest } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
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
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { topic, targetBand } = await req.json()

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 })
    }

    const invalid = validateTextFields({ topic: [topic, INPUT_LIMITS.prompt] })
    if (invalid) return invalid

    const { object } = await retryWithBackoff(
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

    return Response.json({ outline: object })
  } catch (error) {
    console.error("Error generating outline:", errorMessage(error))
    return aiErrorResponse(error, {
      rateLimit: "AI tạo dàn ý đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
      generic: "Failed to generate outline",
    })
  }
}

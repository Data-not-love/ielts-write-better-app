import { aiErrorResponse, errorMessage } from "@/lib/ai-errors"
import { guardAiRequest } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { z } from "zod"

export const maxDuration = 60

const improvementSchema = z.object({
  improvedSentence: z.string(),
  explanation: z.string(),
  grammarIssues: z.array(z.string()),
  spellingIssues: z.array(z.string()),
  styleImprovements: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { sentence, context, category, currentIssue } = await req.json()

    if (!sentence) {
      return Response.json({ error: "Sentence is required" }, { status: 400 })
    }

    const invalid = validateTextFields({
      sentence: [sentence, INPUT_LIMITS.prompt],
      context: [context, INPUT_LIMITS.essay],
      category: [category, INPUT_LIMITS.short],
      currentIssue: [currentIssue, INPUT_LIMITS.prompt],
    })
    if (invalid) return invalid

    // Build a detailed prompt based on the category and current issue
    const categoryDescriptions: Record<string, string> = {
      grammar: "grammar errors such as verb tense, subject-verb agreement, articles, word order, etc.",
      lexical: "vocabulary issues including word choice, collocations, and appropriate usage",
      coherence: "coherence and cohesion problems including unclear references, poor transitions, or logical flow",
      task_response: "task response issues including off-topic content or irrelevant information"
    }

    const categoryFocus = categoryDescriptions[category] || "any writing issues"

    const prompt = `You are an expert IELTS writing tutor. A student has written the following sentence that has been identified as having ${categoryFocus}.

Original sentence: "${sentence}"

${currentIssue ? `Identified issue: ${currentIssue}` : ''}

${context ? `Context: This sentence appears in an essay about: ${context}` : ''}

Please provide:
1. An improved version of the sentence that fixes the identified issues while maintaining the student's intended meaning
2. A clear explanation of what was wrong and why your version is better
3. Specific grammar issues found (if any)
4. Specific spelling issues found (if any)
5. Style improvements made (if any)

Be specific and educational. Focus on helping the student understand not just what to fix, but why.`

    const { object } = await retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: improvementSchema,
            prompt,
            temperature: 0.3,
          }),
        GEMINI_RETRY_CONFIG
      )

    return Response.json({ 
      improvement: {
        improvedSentence: object.improvedSentence,
        explanation: object.explanation,
        grammarIssues: object.grammarIssues,
        spellingIssues: object.spellingIssues,
        styleImprovements: object.styleImprovements,
      }
    })
  } catch (error) {
    console.error("[improve-sentence] Error:", errorMessage(error))
    return aiErrorResponse(error, {
      rateLimit: "AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
      generic: "Không thể tạo đề xuất cải thiện. Vui lòng thử lại.",
    })
  }
}

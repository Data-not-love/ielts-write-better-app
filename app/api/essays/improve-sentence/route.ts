import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
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
    const { sentence, context, category, currentIssue } = await req.json()

    if (!sentence) {
      return Response.json({ error: "Sentence is required" }, { status: 400 })
    }

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

    // Use server-side rate limiting to prevent quota exhaustion
    const { object } = await withRateLimit(() =>
      retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: improvementSchema,
            prompt,
            temperature: 0.3,
          }),
        GEMINI_RETRY_CONFIG
      )
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
  } catch (error: any) {
    console.error("[improve-sentence] Error:", error)
    
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
        error: "AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return Response.json({ 
      error: "Không thể tạo đề xuất cải thiện. Vui lòng thử lại.",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

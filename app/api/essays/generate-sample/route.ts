import { guardAiRequest } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { promptText, taskType, targetBand } = await req.json()

    if (!promptText || !taskType) {
      return Response.json({ error: "Missing required fields: promptText and taskType" }, { status: 400 })
    }

    const invalid = validateTextFields({
      promptText: [promptText, INPUT_LIMITS.prompt],
      taskType: [taskType, INPUT_LIMITS.short],
    })
    if (invalid) return invalid

    const model = getGeminiModel()

    // Default to band 7.0 if not specified
    const band = targetBand || 7.0

    const systemPrompt = `You are an expert IELTS essay writer. Write a sample ${taskType} essay that would achieve a band ${band} score according to official IELTS criteria.

The essay should demonstrate:

Task Response (TR):
- Directly addresses all parts of the prompt
- Clear position/opinion (for Task 2) or accurate description (for Task 1)
- Well-developed ideas with relevant examples
- Stays on topic throughout

Coherence & Cohesion (CC):
- Clear progression throughout
- Appropriate paragraphing
- Effective use of cohesive devices
- Logical organization

Lexical Resource (LR):
- Wide range of vocabulary used naturally and flexibly
- Precise word choices
- Appropriate collocations
- Minimal errors

Grammatical Range & Accuracy (GRA):
- Wide range of structures used flexibly
- Majority of sentences are error-free
- Good control of grammar and punctuation
- Complex sentences where appropriate

Write ONLY the essay text without any meta-commentary, explanations, or feedback. The essay should be between 250-280 words for Task 2 or 150-170 words for Task 1.`

    const userPrompt = `Write a band ${band} IELTS ${taskType} essay for the following prompt:

${promptText}

Remember: Write ONLY the essay, no additional commentary.`

    let result
    try {
      result = await withRateLimit(() =>
        retryWithBackoff(
          () => model.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
          GEMINI_RETRY_CONFIG
        )
      )
    } catch (apiError) {
      console.error("[generate-sample] Gemini API error:", apiError)
      
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError)
      
      if (errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
        throw new Error("API quota limit reached. Please wait a few minutes and try again.")
      }
      
      if (errorMsg.includes("API key")) {
        throw new Error("API key configuration error. Please contact support.")
      }
      
      throw apiError
    }

    const response = result.response
    const essayText = response.text()

    return Response.json({ 
      essay: essayText.trim(),
      wordCount: essayText.trim().split(/\s+/).length
    })
  } catch (error) {
    console.error("[generate-sample] Error:", error)
    return Response.json(
      { error: "Failed to generate sample essay" },
      { status: 500 }
    )
  }
}

import { NextRequest } from "next/server"
import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { issueName, relatedCriterion, userLevel } = await req.json()

    if (!issueName) {
      return Response.json({ error: "Missing issueName" }, { status: 400 })
    }

    const model = getGeminiModel()

    // Create a detailed prompt for generating improvement suggestions
    const prompt = `You are an IELTS writing tutor helping a student improve their writing. The student has a recurring issue in their essays.

Issue: "${issueName}"
${relatedCriterion ? `Related IELTS Criterion: ${getCriterionFullName(relatedCriterion)}` : ""}
${userLevel ? `Student's current level: Band ${userLevel}` : ""}

Please provide detailed, actionable guidance on how to improve this specific issue. Your response should include:

1. **What this issue means**: A clear explanation of what this issue is and why it's problematic in IELTS writing.

2. **How to fix it**: Step-by-step guidance on how to address this issue in future essays.

3. **Examples**: 
   - Show an INCORRECT example that demonstrates this issue
   - Show a CORRECTED version that fixes the issue
   - Explain what makes the corrected version better

4. **Practice tips**: Specific exercises or techniques the student can use to avoid this issue.

5. **Quick checklist**: A brief checklist of 3-4 points the student can refer to while writing to avoid this issue.

Format your response in a clear, structured way that's easy to understand and apply. Be encouraging and constructive.`

    // Use server-side rate limiting to prevent quota exhaustion
    const result = await withRateLimit(() =>
      retryWithBackoff(
        () => model.generateContent(prompt),
        GEMINI_RETRY_CONFIG
      )
    )
    const response = result.response
    const text = response.text()

    return Response.json({
      issueName,
      relatedCriterion,
      suggestions: text,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("[improvement-suggestions] Error:", error)
    return Response.json(
      { 
        error: "Failed to generate improvement suggestions"
      },
      { status: 500 }
    )
  }
}

function getCriterionFullName(criterion: string): string {
  const names: Record<string, string> = {
    TR: "Task Response",
    CC: "Coherence & Cohesion",
    LR: "Lexical Resource",
    GRA: "Grammar & Accuracy"
  }
  return names[criterion] || criterion
}

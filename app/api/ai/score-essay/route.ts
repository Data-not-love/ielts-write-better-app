import { guardPublicDemo } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { scoreEssay, scoringErrorResponse } from "@/lib/essay-scoring"

export const maxDuration = 60

/** Public homepage demo: scores with the same pipeline as real tasks, saves nothing. */
export async function POST(req: Request) {
  try {
    const denied = await guardPublicDemo(req)
    if (denied) return denied

    const { essay, taskType, prompt } = await req.json()

    if (!essay || !taskType) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const invalid = validateTextFields({
      essay: [essay, INPUT_LIMITS.essay],
      taskType: [taskType, INPUT_LIMITS.short],
      prompt: [prompt, INPUT_LIMITS.prompt],
    })
    if (invalid) return invalid

    const feedback = await scoreEssay({ essay, taskType, prompt })
    return Response.json({ feedback })
  } catch (error) {
    console.error("[score-essay] Error:", error instanceof Error ? error.message : error)
    return scoringErrorResponse(error)
  }
}

import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import type { TaskFeedback } from "@/types/tasks"
import { parseScoringResponse, toScoringError } from "@/lib/scoring-parse"

export { ScoringError, scoringErrorResponse, parseScoringResponse } from "@/lib/scoring-parse"
export type { ScoringErrorKind } from "@/lib/scoring-parse"

/**
 * The one IELTS scoring pipeline, shared by the task evaluator and the homepage demo.
 *
 * It never invents a score: if the model's output can't be parsed into a complete
 * result, it throws a ScoringError and the caller reports it so the user can retry.
 */

const SYSTEM_PROMPT = (taskType: string) => `You are an expert IELTS examiner. Evaluate the following ${taskType} essay according to official IELTS criteria:

Task Response (TR): How well the essay addresses the task
- For ${taskType}: Check if the essay directly responds to ALL parts of the prompt
- Assess whether the essay stays on topic and doesn't deviate from the given prompt
- Evaluate if the position/response is clear and well-developed
- For Task 2: Check if both views are discussed if required, and opinion is clearly stated
- PENALIZE essays that go off-topic or don't address the specific prompt given

Coherence & Cohesion (CC): Organization and logical flow
Lexical Resource (LR): Vocabulary range and accuracy
Grammatical Range & Accuracy (GRA): Grammar complexity and correctness

IMPORTANT: The Task Response (TR) score should heavily consider:
1. Whether the essay addresses the SPECIFIC prompt given (not a different topic)
2. Whether all parts of the task are answered
3. Relevance to the topic throughout the essay

CRITICAL: You MUST provide line-level feedback for the essay. Analyze the text thoroughly and identify:
- Grammar errors (verb tense, subject-verb agreement, articles, etc.)
- Lexical issues (word choice, collocations, inappropriate vocabulary)
- Coherence problems (unclear references, poor transitions, logical flow issues)
- Task response issues (off-topic sentences, irrelevant information)

For each error found, provide:
- Exact start and end character indices in the essay text
- Category of the error
- Clear explanation of the problem
- A suggested correction/rewrite

Provide detailed, actionable feedback with specific examples from the text.

Return your response as a JSON object with this exact structure:
{
  "overall_band": number (0-9, can use .5 increments),
  "summary": "brief overall assessment",
  "criteria": {
    "TR": {
      "score": number (0-9),
      "strengths": ["strength 1", "strength 2"],
      "areas_for_improvement": ["issue 1", "issue 2"],
      "suggestions": ["suggestion 1", "suggestion 2"],
      "examples": ["example 1", "example 2"]
    },
    "CC": { same structure },
    "LR": { same structure },
    "GRA": { same structure }
  },
  "action_plan": ["action 1", "action 2", "action 3"],
  "line_level_feedback": [
    {
      "start_index": 0,
      "end_index": 54,
      "category": "grammar" | "lexical" | "coherence" | "task_response",
      "comment": "Explain the specific error or issue here.",
      "suggested_rewrite": "Provide the corrected version here."
    }
  ]
}

IMPORTANT: Provide line-level feedback for any errors or areas for improvement found in the essay. If the essay is exceptionally well-written with no significant errors, the line_level_feedback array may be empty, but this should be rare.`

const VISUAL_RUBRIC = `

TASK 1 DATA ACCURACY (the exact data the candidate saw is given below the prompt):
- Treat the VISUAL DATA as ground truth. Check every figure, ranking, trend and comparison the essay states against it.
- In TR (Task Achievement): reward a clear overview of the main trends or stages; penalize misreported figures, wrong trends or rankings, missing key features, and no overview. Mention each data error by name in TR "areas_for_improvement".
- Add a "task_response" line-level feedback item for every sentence that misreports the data, with a suggested rewrite that uses the correct figures.
- Approximate figures ("about a third", "just under 40%") are acceptable when they are reasonable readings of the data.`

export type ScoreEssayInput = {
  essay: string
  taskType: string
  prompt?: string
  /** Plain-text dump of a Task 1 visual (see visualToText), used as ground truth */
  visualData?: string
}

export async function scoreEssay({ essay, taskType, prompt, visualData }: ScoreEssayInput): Promise<TaskFeedback> {
  const systemPrompt = SYSTEM_PROMPT(taskType) + (visualData ? VISUAL_RUBRIC : "")
  const userPrompt = `PROMPT (This is what the essay MUST respond to):
${prompt || "No specific prompt provided"}
${visualData ? `\nVISUAL DATA (exactly what the candidate saw):\n${visualData}\n` : ""}
ESSAY:
${essay}

Provide a comprehensive IELTS evaluation following the JSON structure specified. Pay special attention to whether the essay addresses the specific prompt above.`

  let text: string
  try {
    const result = await retryWithBackoff(
      () =>
        getGeminiModel().generateContent({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json", maxOutputTokens: 8192 },
        }),
      GEMINI_RETRY_CONFIG,
    )
    text = result.response.text()
  } catch (error) {
    throw toScoringError(error)
  }

  return parseScoringResponse(text)
}


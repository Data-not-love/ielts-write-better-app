import { guardAiRequest } from "@/lib/ai-guard"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { z } from "zod"

export const maxDuration = 60

const promptSchema = z.object({
  prompts: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["Task 1", "Task 2"]),
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    })
  ),
})

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { taskType, topics, count } = await req.json()

    const promptCount = Math.min(Math.max(Number(count) || 4, 1), 10)
    const cleanTopics = Array.isArray(topics)
      ? topics.filter((t): t is string => typeof t === "string" && t.length <= 50).slice(0, 15)
      : []
    const selectedTopics = cleanTopics.length > 0 ? cleanTopics : ["general"]
    const selectedTaskType = taskType || "all"

    // Check if API key is available - never fall back to fake prompts
    if (!process.env.GEMINI_API_KEY) {
      console.error("[v0] GEMINI_API_KEY not found, cannot generate prompts")
      return Response.json({
        error: "AI tạo đề bài chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
        errorType: "NOT_CONFIGURED"
      }, { status: 503 })
    }

    let taskTypeInstruction = ""
    if (selectedTaskType === "Task 1") {
      taskTypeInstruction = "Generate only IELTS Task 1 prompts (describing graphs, charts, diagrams, processes, or maps)."
    } else if (selectedTaskType === "Task 2") {
      taskTypeInstruction = "Generate only IELTS Task 2 prompts (essay questions on various topics)."
    } else {
      taskTypeInstruction = "Generate a mix of IELTS Task 1 and Task 2 prompts."
    }

    const topicsInstruction = selectedTopics.join(", ")

    // Use server-side rate limiting to prevent quota exhaustion
    const { object } = await withRateLimit(() =>
      retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: promptSchema,
            prompt: `Generate ${promptCount} unique and diverse IELTS writing prompts.

${taskTypeInstruction}

Focus on these topics: ${topicsInstruction}

Requirements:
- Make each prompt unique and realistic
- For Task 1: Include specific chart/graph types (bar chart, line graph, pie chart, table, process diagram, map)
- For Task 2: Create thought-provoking essay questions on relevant topics
- Each prompt should have:
  - A unique ID (use UUID format)
  - Correct type ("Task 1" or "Task 2")
  - A descriptive title
  - A detailed description/question
  - 2-4 relevant tags

Ensure variety in:
- Question types (opinion, discussion, problem-solution, advantages-disadvantages)
- Difficulty levels
- Contemporary and relevant topics`,
            temperature: 0.9,
          }),
        GEMINI_RETRY_CONFIG
      )
    )

    return Response.json({ prompts: object.prompts })
  } catch (error: any) {
    console.error("[v0] Error generating prompts:", error)
    
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
        error: "AI tạo đề bài đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return Response.json({ 
      error: "Failed to generate prompts",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

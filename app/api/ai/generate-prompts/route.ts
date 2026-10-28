import { guardAiRequest } from "@/lib/ai-guard"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { z } from "zod"
import { IELTS_TOPICS, toIeltsTopic, type IeltsTopic } from "@/lib/ielts-topics"
import { categoriesForTask, taskOfCategory, toIeltsCategory, type IeltsCategory } from "@/lib/ielts-categories"

export const maxDuration = 60

const promptSchema = z.object({
  prompts: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["Task 1", "Task 2"]),
      category: z.string(),
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

    const { taskType, topics, categories, count } = await req.json()

    const promptCount = Math.min(Math.max(Number(count) || 4, 1), 10)
    // Only known topics reach the model; this also dedupes and fixes casing
    const cleanTopics = Array.isArray(topics)
      ? [...new Set(topics.map(toIeltsTopic).filter((t): t is IeltsTopic => t !== undefined))]
      : []
    const selectedTopics: readonly string[] = cleanTopics.length > 0 ? cleanTopics : IELTS_TOPICS
    const selectedTaskType = taskType || "all"

    // Only known question types for the chosen task reach the model
    const tabCategories = categoriesForTask(selectedTaskType)
    const pickedCategories = Array.isArray(categories)
      ? [...new Set(categories.map(toIeltsCategory).filter((c): c is IeltsCategory => c !== undefined && tabCategories.includes(c)))]
      : []
    const allowedCategories = pickedCategories.length > 0 ? pickedCategories : tabCategories

    // Check if API key is available - never fall back to fake prompts
    if (!process.env.GEMINI_API_KEY) {
      console.error("[v0] GEMINI_API_KEY not found, cannot generate prompts")
      return Response.json({
        error: "AI tạo đề bài chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
        errorType: "NOT_CONFIGURED"
      }, { status: 503 })
    }

    let taskTypeInstruction = ""
    if (pickedCategories.length > 0) {
      taskTypeInstruction = "Generate only prompts of the question types listed below, spreading the prompts across them."
    } else if (selectedTaskType === "Task 1") {
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

Allowed question types (category): ${allowedCategories.map((c) => `"${c}" (${taskOfCategory(c)})`).join(", ")}

Requirements:
- Make each prompt unique and realistic
- For Task 1: The visual must match its category (e.g. "Mixed Charts" combines two chart types, "Map" compares a place over time, "Process" describes stages)
- For Task 2: The question wording must match its category (e.g. "Two-part Question" asks two direct questions)
- Each prompt should have:
  - A unique ID (use UUID format)
  - Correct type ("Task 1" or "Task 2")
  - A category: exactly one of the allowed question types above, spelled exactly as given
  - A descriptive title
  - A detailed description/question
  - 2-4 relevant tags. The FIRST tag must be exactly one of the topic names listed above, spelled exactly as given (e.g. "${selectedTopics[0]}"). Other tags may be free-form.

Ensure variety in:
- Question types, within the allowed categories
- Difficulty levels
- Contemporary and relevant topics`,
            temperature: 0.9,
          }),
        GEMINI_RETRY_CONFIG
      )
    )

    // Normalize tags and category to canonical names so client-side filtering matches;
    // a known category also decides the task type, in case the model mislabels it
    const prompts = object.prompts.map((p) => {
      const category = toIeltsCategory(p.category)
      return {
        ...p,
        type: category ? taskOfCategory(category) : p.type,
        category: category ?? p.category,
        tags: p.tags.map((tag) => toIeltsTopic(tag) ?? tag),
      }
    })

    return Response.json({ prompts })
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

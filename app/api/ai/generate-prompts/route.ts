import { aiErrorResponse, errorMessage } from "@/lib/ai-errors"
import { guardAiRequest } from "@/lib/ai-guard"
import { generateObject } from "ai"
import { getGoogleModel } from "@/lib/ai"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { z } from "zod"
import { IELTS_TOPICS, toIeltsTopic, type IeltsTopic } from "@/lib/ielts-topics"
import { categoriesForTask, taskOfCategory, toIeltsCategory, type IeltsCategory } from "@/lib/ielts-categories"
import { CATEGORY_BY_KIND, fromGenerated, parseVisual, visualGenerationSchema, type Task1Visual } from "@/lib/task1-visual"

export const maxDuration = 60

const promptItemSchema = z.object({
  id: z.string(),
  type: z.enum(["Task 1", "Task 2"]),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  visual: visualGenerationSchema.optional().describe("Required for Task 1 prompts, omitted for Task 2"),
})

/** A prompt as returned to the client: the model's output with a validated visual */
type GeneratedPrompt = Omit<z.infer<typeof promptItemSchema>, "visual"> & { visual?: Task1Visual }

const promptSchemaFor =(count: number) => z.object({ prompts: z.array(promptItemSchema).min(count).max(count) })

// Visual data makes Task 1 prompts several times larger, so they are generated in smaller batches
const MAX_TASK1_PROMPTS = 4

const VISUAL_INSTRUCTIONS = `TASK 1 VISUALS (required for every Task 1 prompt):
Every Task 1 prompt MUST include a "visual" holding the exact data the candidate will see. Set "kind" from the category and fill the matching block completely:
- "Bar Charts" -> kind "bar", "Line Charts" -> kind "line": fill "barOrLine" (unit, 3-8 xLabels such as years or countries, 1-4 series with exactly one number per xLabel).
- "Pie Charts" -> kind "pie": fill "pie" (1-2 pies, each labelled e.g. with a year, 3-6 slices whose values sum to exactly 100).
- "Table Charts" -> kind "table": fill "table" (unit, 2-6 columns, 2-6 rows with exactly one cell per column; cells are strings such as "12.5").
- "Mixed Charts" -> kind "mixed": fill "mixed.parts" with exactly 2 charts of different kinds, each with its own complete block.
- "Process" -> kind "process": fill "process" (5-10 steps with 2-5 word labels, cyclic true for natural cycles).
- "Map" -> kind "map": fill "map.before" and "map.after" (each a year label and 4-9 places, each placed at a different compass position). Show 3-5 clear changes between the two years.
Never leave the matching block empty. The data must look like a real IELTS paper: realistic magnitudes, a clear overall trend, 2-3 notable features (a peak, a crossover, a largest/smallest category), and round-ish numbers.
Decide the data first, then write the description from it: any count the description states (e.g. "three countries", "five stages") must equal the number of series, labels, slices, rows or steps in the visual. If unsure, leave the count out.
The description must refer to the visual (e.g. "The bar chart below shows ...") and end with "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
Task 2 prompts must NOT include a visual.`

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const { taskType, topics, categories, count } = await req.json()

    const requestedCount = Math.min(Math.max(Number(count) || 4, 1), 10)
    const promptCount = taskType === "Task 1" ? Math.min(requestedCount, MAX_TASK1_PROMPTS) : requestedCount
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
      console.error("GEMINI_API_KEY not found, cannot generate prompts")
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

    const { object } = await retryWithBackoff(
        () =>
          generateObject({
            model: getGoogleModel(),
            schema: promptSchemaFor(promptCount),
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
- Contemporary and relevant topics

${selectedTaskType === "Task 2" ? "" : VISUAL_INSTRUCTIONS}`,
            temperature: 0.9,
            // Thinking tokens count against this budget; visuals need the room
            maxOutputTokens: 16_000,
          }),
        GEMINI_RETRY_CONFIG
      )

    // Normalize tags and category to canonical names so client-side filtering matches;
    // a known category also decides the task type, in case the model mislabels it.
    // Task 1 prompts must carry a valid visual (its kind then decides the category);
    // ones without are dropped rather than retried, to save quota.
    const dropped: string[] = []
    const prompts = object.prompts.flatMap((p): GeneratedPrompt[] => {
      const { visual: rawVisual, ...rest } = p
      let category = toIeltsCategory(p.category)
      const type = category ? taskOfCategory(category) : p.type
      const tags = p.tags.map((tag) => toIeltsTopic(tag) ?? tag)

      if (type === "Task 2") {
        return [{ ...rest, type, category: category ?? p.category, tags }]
      }

      const { visual, error } = parseVisual(fromGenerated(rawVisual))
      if (!visual) {
        dropped.push(`${p.category}: ${error}`)
        return []
      }
      category = toIeltsCategory(CATEGORY_BY_KIND[visual.kind])!
      if (pickedCategories.length > 0 && !pickedCategories.includes(category)) {
        dropped.push(`${p.category}: visual kind ${visual.kind} not in selected categories`)
        return []
      }
      return [{ ...rest, type: "Task 1" as const, category, tags, visual }]
    })

    if (dropped.length > 0) {
      console.warn(`[generate-prompts] dropped ${dropped.length}/${object.prompts.length} Task 1 prompts:`, dropped)
    }

    return Response.json({ prompts, dropped: dropped.length })
  } catch (error) {
    console.error("Error generating prompts:", errorMessage(error))
    return aiErrorResponse(error, {
      rateLimit: "AI tạo đề bài đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
      generic: "Failed to generate prompts",
    })
  }
}

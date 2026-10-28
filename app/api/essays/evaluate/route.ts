import { guardAiUser } from "@/lib/ai-guard"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { parseVisual, visualToText, type Task1Visual } from "@/lib/task1-visual"
import { scoreEssay, scoringErrorResponse } from "@/lib/essay-scoring"
import { addScoredRevision, countWords, createScoredTask, getOwnTask } from "@/lib/tasks-server"

export const maxDuration = 60

/**
 * Scores an essay and saves the result server-side.
 *
 * Body: { essayText, save } plus, when creating, { taskType, promptText, visual? }.
 * - save.mode "create": stores a new scored task ({ title, promptId }).
 * - save.mode "revision": re-scores an existing task ({ taskId }); its stored prompt,
 *   task type and visual are used, so the client can't swap the ground truth.
 */
export async function POST(req: Request) {
  try {
    const { uid, denied } = await guardAiUser(req)
    if (denied) return denied

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    const { essayText, save } = body

    if (!essayText || typeof essayText !== "string") return Response.json({ error: "Missing essayText" }, { status: 400 })
    if (save?.mode !== "create" && save?.mode !== "revision") {
      return Response.json({ error: 'save.mode must be "create" or "revision"' }, { status: 400 })
    }

    let taskType: unknown
    let promptText: unknown
    let visual: Task1Visual | undefined

    if (save.mode === "revision") {
      if (typeof save.taskId !== "string" || !save.taskId) return Response.json({ error: "Missing save.taskId" }, { status: 400 })
      const stored = await getOwnTask(uid, save.taskId)
      if (!stored) return Response.json({ error: "Task not found" }, { status: 404 })
      taskType = stored.taskType
      promptText = stored.prompt
      visual = stored.visual ? parseVisual(stored.visual).visual ?? undefined : undefined
    } else {
      taskType = body.taskType
      promptText = body.promptText
      if (body.visual != null) {
        const parsed = parseVisual(body.visual)
        if (!parsed.visual) return Response.json({ error: `Invalid visual: ${parsed.error}` }, { status: 400 })
        visual = parsed.visual
      }
    }

    const invalid = validateTextFields({
      essayText: [essayText, INPUT_LIMITS.essay],
      taskType: [taskType, INPUT_LIMITS.short],
      promptText: [promptText, INPUT_LIMITS.prompt],
      title: [save.title, INPUT_LIMITS.short],
      promptId: [save.promptId, INPUT_LIMITS.short],
    })
    if (invalid) return invalid
    if (typeof taskType !== "string" || !taskType) return Response.json({ error: "Missing taskType" }, { status: 400 })

    const feedback = await scoreEssay({
      essay: essayText,
      taskType,
      prompt: typeof promptText === "string" ? promptText : undefined,
      visualData: visual ? visualToText(visual) : undefined,
    })

    const wordCount = countWords(essayText)
    if (save.mode === "revision") {
      const revisionId = await addScoredRevision(uid, save.taskId, essayText, wordCount, feedback)
      return Response.json({ feedback, taskId: save.taskId, revisionId })
    }

    const { taskId, revisionId } = await createScoredTask(
      uid,
      {
        title: typeof save.title === "string" && save.title.trim() ? save.title.trim() : `${taskType} Essay`,
        prompt: typeof promptText === "string" ? promptText : "",
        promptId: typeof save.promptId === "string" && save.promptId ? save.promptId : null,
        taskType,
        response: essayText,
        wordCount,
        visual,
      },
      feedback,
    )
    return Response.json({ feedback, taskId, revisionId })
  } catch (error) {
    console.error("[evaluate] Error:", error instanceof Error ? error.message : error)
    return scoringErrorResponse(error)
  }
}

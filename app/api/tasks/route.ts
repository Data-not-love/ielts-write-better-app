import { requireUserId, unauthorizedResponse, UnauthorizedError } from "@/lib/firebase-admin"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"
import { parseVisual } from "@/lib/task1-visual"
import { countWords, createDraftTask } from "@/lib/tasks-server"

/** Saves an unscored draft. Scored tasks are created by /api/essays/evaluate. */
export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    const { title, promptText, promptId, taskType, essayText, visual: rawVisual } = body

    if (typeof essayText !== "string" || !essayText.trim()) return Response.json({ error: "Missing essayText" }, { status: 400 })
    if (taskType !== "Task 1" && taskType !== "Task 2") return Response.json({ error: "Invalid taskType" }, { status: 400 })

    const invalid = validateTextFields({
      essayText: [essayText, INPUT_LIMITS.essay],
      promptText: [promptText, INPUT_LIMITS.prompt],
      title: [title, INPUT_LIMITS.short],
      promptId: [promptId, INPUT_LIMITS.short],
    })
    if (invalid) return invalid

    let visual
    if (rawVisual != null) {
      const parsed = parseVisual(rawVisual)
      if (!parsed.visual) return Response.json({ error: `Invalid visual: ${parsed.error}` }, { status: 400 })
      visual = parsed.visual
    }

    const taskId = await createDraftTask(uid, {
      title: typeof title === "string" && title.trim() ? title.trim() : `${taskType} Draft`,
      prompt: typeof promptText === "string" ? promptText : "",
      promptId: typeof promptId === "string" && promptId ? promptId : null,
      taskType,
      response: essayText,
      wordCount: countWords(essayText),
      visual,
    })
    return Response.json({ taskId })
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse()
    console.error("[tasks] Failed to save draft:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Không thể lưu bản nháp. Vui lòng thử lại." }, { status: 500 })
  }
}

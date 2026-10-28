import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import type { Task1Visual } from "@/lib/task1-visual"
import type { TaskFeedback } from "@/types/tasks"

/**
 * Server-side writes for users/{uid}/tasks. Firestore rules make tasks read-only
 * for the browser, so scores can only come from the scoring pipeline.
 * Field layout matches what the client used to write, so existing tasks need no migration.
 * Firestore rejects undefined: optional fields are added only when present.
 */

export type TaskInput = {
  title: string
  prompt: string
  promptId: string | null
  taskType: string
  response: string
  wordCount: number
  visual?: Task1Visual
}

const tasks = (uid: string) => getAdminDb().collection("users").doc(uid).collection("tasks")

const newRevisionId = () => `rev_${Date.now()}`

function baseFields(task: TaskInput) {
  return {
    title: task.title,
    prompt: task.prompt,
    promptId: task.promptId,
    taskType: task.taskType,
    response: task.response,
    wordCount: task.wordCount,
    ...(task.visual ? { visual: task.visual } : {}),
  }
}

function scoreFields(feedback: TaskFeedback) {
  return {
    status: "scored",
    overallBand: feedback.overallBand,
    summary: feedback.summary,
    feedback,
    actionItems: feedback.actionItems,
  }
}

export async function createScoredTask(uid: string, task: TaskInput, feedback: TaskFeedback) {
  const now = Timestamp.now()
  const revisionId = newRevisionId()
  const ref = await tasks(uid).add({
    ...baseFields(task),
    ...scoreFields(feedback),
    revisions: [{ id: revisionId, overallBand: feedback.overallBand, summary: feedback.summary, createdAt: now, feedback, response: task.response }],
    createdAt: now,
    updatedAt: now,
  })
  return { taskId: ref.id, revisionId }
}

export async function createDraftTask(uid: string, task: TaskInput) {
  const now = Timestamp.now()
  const ref = await tasks(uid).add({ ...baseFields(task), status: "draft", revisions: [], createdAt: now, updatedAt: now })
  return ref.id
}

/** The stored task, or null if it doesn't exist under this user. */
export async function getOwnTask(uid: string, taskId: string) {
  const snap = await tasks(uid).doc(taskId).get()
  return snap.exists ? snap.data() ?? null : null
}

/** Records a re-scored version: the edited essay becomes the task's response. */
export async function addScoredRevision(uid: string, taskId: string, response: string, wordCount: number, feedback: TaskFeedback) {
  const ref = tasks(uid).doc(taskId)
  const revisionId = newRevisionId()
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error("Task not found")
    const revisions = Array.isArray(snap.data()?.revisions) ? snap.data()!.revisions : []
    const now = Timestamp.now()
    tx.update(ref, {
      ...scoreFields(feedback),
      response,
      wordCount,
      revisions: [...revisions, { id: revisionId, overallBand: feedback.overallBand, summary: feedback.summary, createdAt: now, feedback, response }],
      updatedAt: now,
    })
  })
  return revisionId
}

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

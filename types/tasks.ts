import type { Timestamp } from "firebase/firestore"

export type CriterionKey = "TR" | "CC" | "LR" | "GRA"

export type FeedbackCategory = "grammar" | "lexical" | "coherence" | "task_response"

export interface LineLevelFeedback {
  startIndex: number
  endIndex: number
  category: FeedbackCategory
  comment: string
  suggestedRewrite?: string
}

export interface CriterionFeedback {
  score: number
  strengths: string[]
  issues: string[]
  suggestions: string[]
  examples: string[]
}

export interface TaskFeedback {
  overallBand: number
  summary: string
  criteria: Record<CriterionKey, CriterionFeedback>
  actionItems: string[]
  lineLevelFeedback?: LineLevelFeedback[]
}

export interface Revision {
  id: string
  overallBand: number
  summary: string
  createdAt: Timestamp
  feedback?: TaskFeedback
  /** Essay text this revision scored (stored since server-side scoring; absent on older revisions) */
  response?: string
}

/** Response of /api/essays/improve-sentence */
export interface SentenceImprovement {
  improvedSentence: string
  explanation: string
  grammarIssues: string[]
  spellingIssues: string[]
  styleImprovements: string[]
}

export interface TaskDocument {
  id: string
  title?: string
  prompt?: string
  promptId?: string | null
  taskType?: string
  /** Task 1 chart/table/map/process data (lib/task1-visual.ts, versioned). Validate before use. */
  visual?: unknown
  response?: string
  status?: string
  overallBand?: number
  feedback?: TaskFeedback
  wordCount?: number
  summary?: string
  actionItems?: string[]
  revisions?: Revision[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

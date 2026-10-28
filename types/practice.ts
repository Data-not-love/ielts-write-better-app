// Response shapes of the practice-tool API routes (see the zod schemas in app/api/ai/*/route.ts).
// Declared here rather than inferred, so client components don't import server modules.

export interface EssayOutline {
  introduction: { hook: string; background: string; thesis: string }
  body1: { topic: string; points: string[] }
  body2: { topic: string; points: string[] }
  counterArgument: { point: string; rebuttal: string }
  conclusion: { summary: string; finalThought: string }
}

export interface GrammarIssue {
  line: number
  original: string
  suggested: string
  rule: string
  explanation: string
}

export interface Paraphrase {
  text: string
  style: "Concise" | "Formal" | "Band-up vocab" | "Academic" | "Expanded"
  description: string
}

/** An error carrying a toast title, thrown by the practice tools on failed requests */
export type TitledError = Error & { title?: string }

export function titledError(message: string, title?: string): TitledError {
  return Object.assign(new Error(message), { title })
}

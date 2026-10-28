import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { wrapLanguageModel } from "ai"
import { isRetryableError } from "@/lib/retry-utils"

const DEFAULT_GOOGLE_MODEL = "gemini-3.5-flash"
// Used when the default model is overloaded (503) or out of quota (429)
const FALLBACK_GOOGLE_MODEL = "gemini-3.5-flash-lite"

let googleClient: ReturnType<typeof createGoogleGenerativeAI> | undefined

export function ensureGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  return apiKey
}

function getGoogleClient() {
  if (!googleClient) {
    googleClient = createGoogleGenerativeAI({
      apiKey: ensureGeminiApiKey(),
    })
  }

  return googleClient
}

/**
 * Get Google model for AI SDK
 * Falls back to a lighter model when the default one is overloaded.
 * Note: Retry logic is handled at the API route level using retryWithBackoff
 */
export function getGoogleModel(modelId?: string) {
  const client = getGoogleClient()
  const fallbackModel = client(FALLBACK_GOOGLE_MODEL)

  return wrapLanguageModel({
    model: client(modelId ?? DEFAULT_GOOGLE_MODEL),
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate()
        } catch (error) {
          if (!isRetryableError(error)) throw error
          console.warn(`[ai] Model overloaded or out of quota, falling back to ${FALLBACK_GOOGLE_MODEL}`)
          return fallbackModel.doGenerate(params)
        }
      },
    },
  })
}

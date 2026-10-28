import { createGoogleGenerativeAI } from "@ai-sdk/google"

const DEFAULT_GOOGLE_MODEL = "gemini-3.5-flash"

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
 * Note: Retry logic is handled at the API route level using retryWithBackoff
 */
export function getGoogleModel(modelId?: string) {
  return getGoogleClient()(modelId ?? DEFAULT_GOOGLE_MODEL)
}

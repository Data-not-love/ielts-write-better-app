import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  type GenerativeModel,
  type StartChatParams,
} from "@google/generative-ai"
import { isChatModelId } from "@/lib/gemini-models"
import { isRetryableError } from "@/lib/retry-utils"

const PRIMARY_MODEL = "gemini-3.5-flash"
// Used when the primary model is overloaded (503) or out of quota (429)
const FALLBACK_MODEL = "gemini-3.5-flash-lite"
// Newest models sometimes hang instead of returning 503; give up and fall back after this
const FIRST_RESPONSE_TIMEOUT_MS = 20_000

let genAI: GoogleGenerativeAI | null = null

export function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set")
    }
    // Initialize with v1 API endpoint (not v1beta)
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

// Try each model in order, moving on only when one is overloaded, out of quota or timed out
async function withFallback<T>(
  models: string[],
  run: (model: string, isLast: boolean) => Promise<T>
): Promise<T> {
  for (let i = 0; ; i++) {
    const isLast = i === models.length - 1
    try {
      return await run(models[i], isLast)
    } catch (error) {
      if (isLast || !(isRetryableError(error) || error instanceof GoogleGenerativeAIAbortError)) throw error
      console.warn(`[gemini] ${models[i]} unavailable (overloaded, out of quota or timed out), falling back to ${models[i + 1]}`)
    }
  }
}

/**
 * Get a Gemini model wrapper. A requested model (e.g. from the chat model picker) is used
 * first when it is a known chat model; scoring routes pass nothing and always use PRIMARY_MODEL.
 */
export function getGeminiModel(modelName?: string) {
  const client = getGeminiClient()
  const requested = modelName && isChatModelId(modelName) ? [modelName] : []
  const models = [...new Set([...requested, PRIMARY_MODEL, FALLBACK_MODEL])]

  return {
    generateContent: (request: Parameters<GenerativeModel["generateContent"]>[0]) =>
      withFallback(models, (model) => client.getGenerativeModel({ model }).generateContent(request)),
    startChat: (params?: StartChatParams) => ({
      sendMessageStream: (message: Parameters<ReturnType<GenerativeModel["startChat"]>["sendMessageStream"]>[0]) =>
        withFallback(models, async (model, isLast) => {
          // Only bounds the wait for the stream to start; the timer is cleared once it does
          const controller = new AbortController()
          const timer = isLast ? undefined : setTimeout(() => controller.abort(), FIRST_RESPONSE_TIMEOUT_MS)
          try {
            return await client
              .getGenerativeModel({ model })
              .startChat(params)
              .sendMessageStream(message, { signal: controller.signal })
          } finally {
            clearTimeout(timer)
          }
        }),
    }),
  }
}

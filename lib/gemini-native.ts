import { GoogleGenerativeAI, type GenerativeModel, type StartChatParams } from "@google/generative-ai"
import { isRetryableError } from "@/lib/retry-utils"

const PRIMARY_MODEL = "gemini-3.5-flash"
// Used when the primary model is overloaded (503) or out of quota (429)
const FALLBACK_MODEL = "gemini-3.5-flash-lite"

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

async function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary()
  } catch (error) {
    if (!isRetryableError(error)) throw error
    console.warn(`[gemini] ${PRIMARY_MODEL} overloaded or out of quota, falling back to ${FALLBACK_MODEL}`)
    return fallback()
  }
}

export function getGeminiModel(modelName?: string) {
  const client = getGeminiClient()
  // Always use gemini-3.5-flash for scoring - do not allow overrides
  const primary = client.getGenerativeModel({ model: PRIMARY_MODEL })
  const fallback = client.getGenerativeModel({ model: FALLBACK_MODEL })

  return {
    generateContent: (request: Parameters<GenerativeModel["generateContent"]>[0]) =>
      withFallback(
        () => primary.generateContent(request),
        () => fallback.generateContent(request)
      ),
    startChat: (params?: StartChatParams) => {
      const primaryChat = primary.startChat(params)
      const fallbackChat = fallback.startChat(params)
      return {
        sendMessageStream: (message: Parameters<typeof primaryChat.sendMessageStream>[0]) =>
          withFallback(
            () => primaryChat.sendMessageStream(message),
            () => fallbackChat.sendMessageStream(message)
          ),
      }
    },
  }
}

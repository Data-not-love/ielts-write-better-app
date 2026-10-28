import { GoogleGenerativeAI } from "@google/generative-ai"

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

export function getGeminiModel(modelName?: string) {
  const client = getGeminiClient()
  // Always use gemini-3.5-flash for scoring - do not allow overrides
  const model = "gemini-3.5-flash"
  return client.getGenerativeModel({ 
    model,
    // Ensure we're using v1 API, not v1beta
  })
}

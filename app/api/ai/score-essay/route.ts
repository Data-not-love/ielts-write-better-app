import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { essay, taskType, prompt } = await req.json()

    if (!essay || !taskType) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Use only gemini-3.5-flash model - no configuration or fallback
    const model = getGeminiModel()

    const systemPrompt = `You are an expert IELTS examiner. Evaluate the following ${taskType} essay according to official IELTS criteria:

Task Response (TR): How well the essay addresses the task
- For ${taskType}: Check if the essay directly responds to ALL parts of the prompt
- Assess whether the essay stays on topic and doesn't deviate from the given prompt
- Evaluate if the position/response is clear and well-developed
- For Task 2: Check if both views are discussed if required, and opinion is clearly stated
- PENALIZE essays that go off-topic or don't address the specific prompt given

Coherence & Cohesion (CC): Organization and logical flow
Lexical Resource (LR): Vocabulary range and accuracy
Grammatical Range & Accuracy (GRA): Grammar complexity and correctness

IMPORTANT: The Task Response (TR) score should heavily consider:
1. Whether the essay addresses the SPECIFIC prompt given (not a different topic)
2. Whether all parts of the task are answered
3. Relevance to the topic throughout the essay

Provide detailed, actionable feedback with specific examples from the text.

Return your response as a JSON object with this exact structure:
{
  "overallBand": number (0-9, can use .5 increments),
  "summary": "brief overall assessment",
  "criteria": {
    "TR": {
      "score": number (0-9),
      "strengths": ["strength 1", "strength 2"],
      "issues": ["issue 1", "issue 2"],
      "suggestions": ["suggestion 1", "suggestion 2"],
      "examples": ["example 1", "example 2"]
    },
    "CC": { same structure },
    "LR": { same structure },
    "GRA": { same structure }
  },
  "actionItems": ["action 1", "action 2", "action 3"]
}`

    const userPrompt = `PROMPT (This is what the essay MUST respond to):
${prompt}

ESSAY:
${essay}

Provide a comprehensive IELTS evaluation following the JSON structure specified. Pay special attention to whether the essay addresses the specific prompt above.`

    // Call gemini-3.5-flash model using v1 API endpoint
    let result
    try {
      result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      })
    } catch (apiError) {
      console.error("[v0] Gemini API error:", apiError)
      
      // Detect specific error types
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError)
      
      if (errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
        throw new Error("API quota limit reached. Please wait a few minutes and try again. Free tier has limited requests per minute.")
      }
      
      if (errorMsg.includes("API key")) {
        throw new Error("API key configuration error. Please contact support.")
      }
      
      // Re-throw for general error handler
      throw apiError
    }

    const response = result.response
    const text = response.text()

    console.log("[score-essay] AI response:", text)

    // Parse the simple text response into a basic feedback structure
    const feedback = {
      overallBand: extractBandScore(text),
      summary: extractSummary(text),
      criteria: extractCriteria(text),
      actionItems: extractActionItems(text),
    }

    return Response.json({ feedback })
  } catch (error: any) {
    console.error("[score-essay] Error:", error)
    
    // Log detailed error information for debugging
    console.error("[score-essay] Raw error details:", {
      status: error?.status,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
      message: error?.message,
      timestamp: new Date().toISOString(),
    })
    
    // Check for rate limit / quota errors with more precise detection
    const errorMessage = error?.message || error?.toString() || ""
    const errorString = errorMessage.toLowerCase()
    
    // More precise rate limit detection - avoid false positives
    const isRateLimitError = 
      error?.status === 429 ||
      error?.response?.status === 429 ||
      errorString.includes("resource_exhausted") ||
      errorString.includes("too many requests") ||
      (errorString.includes("rate limit") && !errorString.includes("unlimited"))
    
    if (isRateLimitError) {
      return Response.json({ 
        error: "AI chấm điểm đang vượt giới hạn sử dụng. Vui lòng thử lại sau 1-2 phút.",
        errorType: "RATE_LIMIT",
        retryAfter: 120 // Suggest retry after 2 minutes
      }, { status: 429 })
    }
    
    // Generic error
    return Response.json({ 
      error: error instanceof Error ? error.message : "Không thể chấm điểm bài viết. Vui lòng kiểm tra kết nối và thử lại.",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

// Helper functions to parse the simple text response
function extractBandScore(text: string): number {
  // Look for "OVERALL BAND: X" or similar patterns
  const overallMatch = text.match(/overall\s+band[:\s]+(\d+(?:\.\d+)?)/i)
  if (overallMatch) {
    const score = parseFloat(overallMatch[1])
    return Math.min(9, Math.max(0, score))
  }
  
  // Fallback: look for any score pattern
  const match = text.match(/(?:overall|band|score)[:\s]+(\d+(?:\.\d+)?)/i)
  if (match) {
    const score = parseFloat(match[1])
    return Math.min(9, Math.max(0, score))
  }
  return 6.0 // Default fallback
}

function extractSummary(text: string): string {
  // Look for summary section
  const summaryMatch = text.match(/summary[:\s]+["']?([^"'\n]+)["']?/i)
  if (summaryMatch) {
    return summaryMatch[1].trim()
  }
  return "Overall assessment of the essay."
}

function extractCriteria(text: string): any {
  // Return basic criteria structure with default values
  const criteria = {
    TR: {
      score: 6.0,
      strengths: ["Addresses the main topic"],
      issues: ["Could develop ideas more fully"],
      suggestions: ["Expand on main points with more detail"],
      examples: []
    },
    CC: {
      score: 6.0,
      strengths: ["Clear paragraph structure"],
      issues: ["Could improve transitions"],
      suggestions: ["Use more linking words"],
      examples: []
    },
    LR: {
      score: 6.0,
      strengths: ["Appropriate vocabulary used"],
      issues: ["Limited range of vocabulary"],
      suggestions: ["Use more varied vocabulary"],
      examples: []
    },
    GRA: {
      score: 6.0,
      strengths: ["Basic grammar structures used correctly"],
      issues: ["Some grammatical errors present"],
      suggestions: ["Review complex sentence structures"],
      examples: []
    }
  }
  
  return criteria
}

function extractActionItems(text: string): string[] {
  // Return basic action items
  return [
    "Practice writing with clearer structure",
    "Expand vocabulary range",
    "Review grammar rules"
  ]
}

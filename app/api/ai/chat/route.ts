import { guardAiRequest } from "@/lib/ai-guard"
import { NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
import { withRateLimit } from "@/lib/server-rate-limiter"
import { INPUT_LIMITS, validateTextFields } from "@/lib/input-limits"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const denied = await guardAiRequest(req)
    if (denied) return denied

    const json = await req.json().catch(() => null)
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { messages, tone, level, attachedTask, model } = json

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "`messages` must be an array" }, { status: 400 })
    }

    const normalizedMessages = messages.filter(Boolean).map((m: any) => ({
      id: m.id ?? crypto.randomUUID(),
      role: m.role === "user" || m.role === "assistant" ? m.role : "user",
      content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
    }))

    const totalChars = normalizedMessages.reduce((sum, m) => sum + m.content.length, 0)
    if (normalizedMessages.length > INPUT_LIMITS.chatMessages || totalChars > INPUT_LIMITS.chatTotal) {
      return NextResponse.json({ error: "Conversation is too long. Please start a new chat." }, { status: 413 })
    }

    const invalid = validateTextFields({
      tone: [tone, INPUT_LIMITS.short],
      level: [level, INPUT_LIMITS.short],
      model: [model, INPUT_LIMITS.short],
      "attachedTask.prompt": [attachedTask?.prompt, INPUT_LIMITS.prompt],
      "attachedTask.essay": [attachedTask?.essay, INPUT_LIMITS.essay],
    })
    if (invalid) return invalid

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 })
    }

    let systemPrompt = `You are an expert IELTS writing tutor. Help students improve their writing by:
- Analyzing essays using TR/CC/LR/GRA criteria
- Suggesting better vocabulary and phrasing
- Explaining grammar rules clearly
- Providing specific, actionable feedback

Tone: ${tone || "neutral"}
Student Level: ${level || "B2"}`

    if (attachedTask?.prompt || attachedTask?.essay) {
      systemPrompt += `

Attached Task Context:
Prompt: ${attachedTask?.prompt ?? ""}
Essay: ${attachedTask?.essay ?? ""}`
    }

    const geminiMessages = normalizedMessages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }))

    const geminiModel = getGeminiModel(typeof model === "string" && model.trim() ? model : undefined)

    const chat = geminiModel.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    })

    const lastMessage = geminiMessages[geminiMessages.length - 1]
    // Use server-side rate limiting to prevent quota exhaustion
    const result = await withRateLimit(() =>
      retryWithBackoff(
        () => chat.sendMessageStream(lastMessage.parts[0].text),
        GEMINI_RETRY_CONFIG
      )
    )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            controller.enqueue(encoder.encode(text))
          }
          controller.close()
        } catch (error) {
          console.error("[/api/ai/chat] streaming error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err: any) {
    console.error("[/api/ai/chat] error:", err?.stack || err?.message || err)
    console.error("[/api/ai/chat] Error details:", {
      status: err?.status,
      message: err?.message,
      timestamp: new Date().toISOString(),
    })
    
    // Check for rate limit / quota errors
    const errorMessage = err?.message || err?.toString() || ""
    const isRateLimitError = 
      err?.status === 429 ||
      err?.response?.status === 429 ||
      errorMessage.toLowerCase().includes("too many requests") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.includes("429")
    
    if (isRateLimitError) {
      return NextResponse.json({ 
        error: "AI chat đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
        errorType: "RATE_LIMIT"
      }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: err?.message ?? "Failed to process chat",
      errorType: "GENERIC"
    }, { status: 500 })
  }
}

import { aiErrorResponse, errorMessage } from "@/lib/ai-errors"
import { guardAiRequest } from "@/lib/ai-guard"
import { NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini-native"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"
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

    const normalizedMessages = (messages as unknown[])
      .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
      .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
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

    const geminiMessages = normalizedMessages.map((msg) => ({
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
      // startChat() sends this as-is (unlike getGenerativeModel it does not wrap a plain
      // string), so it must already be a Content object or the API rejects it with a 400
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    })

    const lastMessage = geminiMessages[geminiMessages.length - 1]
    const result = await retryWithBackoff(
        () => chat.sendMessageStream(lastMessage.parts[0].text),
        GEMINI_RETRY_CONFIG
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
  } catch (err) {
    console.error("[/api/ai/chat] error:", errorMessage(err))
    return aiErrorResponse(err, {
      rateLimit: "AI chat đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.",
      generic: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
    })
  }
}

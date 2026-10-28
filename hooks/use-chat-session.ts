"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/components/auth/auth-provider"
import type { TaskFeedback } from "@/types/tasks"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface GeminiModelOption {
  id: string
  displayName: string
  description?: string
}

export interface ScoredEssay {
  id: string
  title: string
  prompt: string
  response: string
  taskType: string
  overallBand: number
  feedback?: TaskFeedback
  updatedAt?: unknown
}

const RATE_LIMIT_HINTS = ["vượt giới hạn", "rate limit", "quota", "too many requests"]

/** What the assistant says when a request fails: the server's message where it helps the user act. */
function chatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (RATE_LIMIT_HINTS.some((hint) => lower.includes(hint))) {
    return "Xin lỗi, AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút."
  }
  if (message.includes("đăng nhập")) return message
  return "Sorry, I encountered an error. Please try again."
}

/**
 * State and actions shared by the full chat page and the floating widget:
 * model list, the user's scored essays, and streamed replies from /api/ai/chat.
 * `active` lets the floating widget defer both fetches until it is first opened.
 */
export function useChatSession({ active = true }: { active?: boolean } = {}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [tone, setTone] = useState("neutral")
  const [level, setLevel] = useState("B2")
  const [modelOptions, setModelOptions] = useState<GeminiModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [modelError, setModelError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scoredEssays, setScoredEssays] = useState<ScoredEssay[]>([])
  const [selectedEssay, setSelectedEssay] = useState<ScoredEssay | null>(null)
  const [loadingEssays, setLoadingEssays] = useState(false)

  // Fetch once, on first activation. A ref (not state) so flipping it does not re-run
  // the effect; no cancellation either, so StrictMode double-invoking cannot drop the result.
  const modelsRequested = useRef(false)

  useEffect(() => {
    if (!active || modelsRequested.current) return
    modelsRequested.current = true
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/ai/models")
        if (!response.ok) {
          const { error } = await response.json().catch(() => ({ error: "" }))
          throw new Error(error || "Failed to load Gemini models")
        }
        const data = await response.json()
        const options: GeminiModelOption[] = data.models ?? []
        setModelOptions(options)
        setSelectedModel(data.defaultModelId ?? options[0]?.id ?? "")
        setModelError(null)
      } catch (error) {
        setModelError(error instanceof Error ? error.message : "Failed to load Gemini models")
      }
    }
    fetchModels()
  }, [active])

  useEffect(() => {
    if (!user || !active) {
      if (!user) setScoredEssays([])
      return
    }
    let cancelled = false
    const fetchScoredEssays = async () => {
      setLoadingEssays(true)
      try {
        const response = await authFetch("/api/essays/scored")
        if (!response.ok) throw new Error("Failed to fetch scored essays")
        const data = await response.json()
        if (!cancelled) setScoredEssays(data.essays || [])
      } catch (error) {
        console.error("Failed to load scored essays:", error)
        if (!cancelled) setScoredEssays([])
      } finally {
        if (!cancelled) setLoadingEssays(false)
      }
    }
    fetchScoredEssays()
    return () => {
      cancelled = true
    }
  }, [user, active])

  const send = async (text: string) => {
    const userMessage: ChatMessage = { role: "user", content: text }
    const history = [...messages, userMessage]
    setMessages(history)
    setIsLoading(true)

    try {
      const response = await authFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          tone,
          level,
          model: selectedModel || undefined,
          attachedTask: selectedEssay ? { prompt: selectedEssay.prompt, essay: selectedEssay.response } : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(typeof data?.error === "string" ? data.error : `Request failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("Chat response did not include a readable stream")
      const decoder = new TextDecoder()
      let reply = ""

      setMessages((prev) => [...prev, { role: "assistant", content: "" }])
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        reply += decoder.decode(value, { stream: true })
        const content = reply
        // Replace the last message instead of mutating it, so React sees the change
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content }])
      }
    } catch (error) {
      console.error("Chat request failed:", error)
      setMessages((prev) => [...prev, { role: "assistant", content: chatErrorMessage(error) }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput("")
    return send(text)
  }

  const handleQuickAction = (action: string) => {
    if (!selectedEssay || isLoading) return
    return send(action)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return {
    messages,
    input,
    setInput,
    tone,
    setTone,
    level,
    setLevel,
    modelOptions,
    selectedModel,
    setSelectedModel,
    modelError,
    isLoading,
    scoredEssays,
    selectedEssay,
    setSelectedEssay,
    loadingEssays,
    handleSend,
    handleQuickAction,
    handleKeyDown,
  }
}

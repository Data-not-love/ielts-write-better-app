/**
 * Error handling shared by the AI routes. Kept free of runtime imports so it can be
 * unit tested and imported by other pure modules.
 */

type ErrorLike = { status?: number; response?: { status?: number }; message?: string }

/** True for Gemini quota / rate-limit failures, which the user can fix by waiting. */
export function isRateLimitError(error: unknown): boolean {
  const e = (typeof error === "object" && error !== null ? error : {}) as ErrorLike
  const message = (e.message ?? String(error)).toLowerCase()
  return (
    e.status === 429 ||
    e.response?.status === 429 ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("too many requests") ||
    message.includes("quota") ||
    (message.includes("rate limit") && !message.includes("unlimited"))
  )
}

/**
 * The response for a failed AI call: 429 with the route's rate-limit message, otherwise
 * a generic 500. Internal error details are never sent to the client.
 */
export function aiErrorResponse(error: unknown, messages: { rateLimit: string; generic: string }): Response {
  if (isRateLimitError(error)) {
    return Response.json({ error: messages.rateLimit, errorType: "RATE_LIMIT" }, { status: 429 })
  }
  return Response.json({ error: messages.generic, errorType: "GENERIC" }, { status: 500 })
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

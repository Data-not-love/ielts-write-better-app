import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { requireUserId, UnauthorizedError } from "@/lib/firebase-admin"

/**
 * Gate for routes that spend Gemini quota: verifies the Firebase ID token and
 * applies a shared (Upstash Redis) rate limit, so the limit holds across all
 * serverless instances.
 */

// Vercel's Upstash integration exposes KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

const limiters = redis
  ? {
      // Signed-in users: AI features across the whole app
      user: new Ratelimit({ redis, prefix: "rl:ai:user", limiter: Ratelimit.slidingWindow(40, "1 h") }),
      // Anonymous homepage demo, keyed by IP
      demo: new Ratelimit({ redis, prefix: "rl:ai:demo", limiter: Ratelimit.slidingWindow(5, "1 h") }),
    }
  : null

let warnedMissingRedis = false

async function applyLimit(kind: "user" | "demo", key: string): Promise<Response | null> {
  if (!limiters) {
    if (!warnedMissingRedis) {
      console.warn("[ai-guard] Upstash Redis is not configured; AI rate limiting is disabled")
      warnedMissingRedis = true
    }
    return null
  }

  try {
    const { success, reset } = await limiters[kind].limit(key)
    if (success) return null
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return Response.json(
      { error: "Bạn đã vượt giới hạn sử dụng AI. Vui lòng thử lại sau.", errorType: "RATE_LIMITED", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  } catch (error) {
    // Don't take AI features down if Redis is briefly unreachable
    console.error("[ai-guard] Rate limit check failed:", error)
    return null
  }
}

/** Requires a signed-in user and applies the per-user limit. Returns an error response, or null to proceed. */
export async function guardAiRequest(req: Request): Promise<Response | null> {
  let userId: string
  try {
    userId = await requireUserId(req)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng AI.", errorType: "UNAUTHORIZED" },
        { status: 401 },
      )
    }
    throw error
  }
  return applyLimit("user", userId)
}

/** Per-IP limit for the public homepage demo. Returns an error response, or null to proceed. */
export async function guardPublicDemo(req: Request): Promise<Response | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  return applyLimit("demo", ip)
}

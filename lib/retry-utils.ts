import { isRateLimitError } from "./ai-errors.ts"

/**
 * Retry utility with exponential backoff for handling rate limits and quota errors
 */

export interface RetryConfig {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 32000,
  backoffMultiplier: 2,
}

/**
 * Check if an error means the model is temporarily overloaded (503 / high demand)
 */
type ErrorLike = { status?: number; statusCode?: number; response?: { status?: number }; message?: string }

export function isModelOverloadedError(error: unknown): boolean {
  if (!error) return false
  const e = error as ErrorLike

  if (e.status === 503 || e.statusCode === 503 || e.response?.status === 503) {
    return true
  }

  const errorString = (e.message || String(error)).toLowerCase()

  return (
    errorString.includes("503") ||
    errorString.includes("high demand") ||
    errorString.includes("overloaded") ||
    errorString.includes("service unavailable")
  )
}

/**
 * Check if an error is retryable (429 Too Many Requests, quota errors, or temporary overload).
 * Quotas are per model, so these errors also mean a different model may still succeed.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false
  return isModelOverloadedError(error) || isRateLimitError(error)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  return Math.min(delay, config.maxDelayMs)
}

/**
 * Retry a function with exponential backoff
 * @param fn The async function to retry
 * @param config Retry configuration
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (!isRetryableError(error) || attempt >= finalConfig.maxRetries) {
        throw error
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, finalConfig)
      console.warn(
        `[Retry] Rate limit hit. Retry #${attempt + 1}/${finalConfig.maxRetries} after ${delayMs}ms`,
        error instanceof Error ? error.message : String(error)
      )

      await sleep(delayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Retry configuration optimized for Gemini API
 * Conservative retries to avoid hitting rate limits too aggressively
 * With server-side rate limiting, we need fewer retries
 * Reduced from 3 to 1 retry to minimize quota consumption on free tier
 */
export const GEMINI_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  initialDelayMs: 5000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

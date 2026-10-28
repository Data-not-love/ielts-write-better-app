# API Rate Limiting & Quota Management

This document explains how the application manages Gemini API rate limits and quota to prevent "quota exceeded" errors.

## Problem Overview

When using Gemini API with free tier or limited quota, you may encounter:
- **RPM (Requests Per Minute)** limits - e.g., 15 requests/minute
- **TPM (Tokens Per Minute)** limits - e.g., 1,000,000 tokens/minute  
- **RPD (Requests Per Day)** limits - e.g., 200 requests/day

Even if your usage dashboard shows you're not hitting limits, you can still get quota exceeded errors if:
1. Multiple requests arrive simultaneously (bursts)
2. Requests are sent too rapidly within a small time window
3. You're using the wrong API key or project
4. You've hit a different quota limit (monthly, billing, etc.)

## Solution Implementation

### 1. Server-Side Rate Limiting (`lib/server-rate-limiter.ts`)

We implement a **global server-side request queue** that ensures:
- **Max 1 concurrent request** - Only one AI request runs at a time
- **Minimum 4 seconds between requests** - Ensures max ~15 RPM (conservative for stability)
- **FIFO queue processing** - Requests are processed in order

This prevents request bursts and ensures smooth quota usage with a safety margin.

### 2. Conservative Retry Configuration (`lib/retry-utils.ts`)

Updated retry settings for optimal quota usage:
- **Max 1 retry** (reduced from 3) - Minimize API calls, fail faster
- **5-second initial delay** - Give time for quota reset
- **10-second max delay** (reduced from 30s) - Faster failure detection
- **2x backoff multiplier** - Standard exponential backoff

With these settings, a single request can make at most 2 API calls (1 initial + 1 retry), reducing quota consumption significantly.

### 3. All API Routes Updated

Every AI endpoint now uses the rate limiter:
- `/api/ai/score-essay` - Essay scoring
- `/api/ai/chat` - AI chatbot
- `/api/ai/grammar-check` - Grammar checking
- `/api/ai/paraphrase` - Text paraphrasing
- `/api/ai/generate-outline` - Outline generation
- `/api/ai/generate-prompts` - Prompt generation

Example usage:
```typescript
import { withRateLimit } from "@/lib/server-rate-limiter"
import { retryWithBackoff, GEMINI_RETRY_CONFIG } from "@/lib/retry-utils"

const result = await withRateLimit(() =>
  retryWithBackoff(
    () => model.generateContent(...),
    GEMINI_RETRY_CONFIG
  )
)
```

### 4. Enhanced Error Handling

Better error messages in Vietnamese:
- Clear explanation when rate limits are hit
- Suggestion to retry after 1-2 minutes
- Logging with timestamps for debugging

## How It Works

### Request Flow

1. **User submits request** → Frontend calls API endpoint
2. **API endpoint receives request** → Wraps AI call in `withRateLimit()`
3. **Rate limiter queues request** → Checks if can process immediately
4. **Rate limiter processes** → Waits for minimum interval if needed
5. **Retry logic attempts** → Up to 3 retries with exponential backoff
6. **Response returned** → Success or error with helpful message

### Queue Behavior

```
Request A arrives → Process immediately (activeRequests: 1)
Request B arrives → Queue (waiting for 4s interval)
Request A completes after 2s → Wait 2s more
After 4s total → Process Request B
Request C arrives → Queue behind B
```

## Configuration Tuning

If you still experience issues, you can adjust settings:

### Increase interval between requests
```typescript
// In lib/server-rate-limiter.ts
export function getGeminiRateLimiter(): ServerRateLimiter {
  if (!geminiRateLimiter) {
    geminiRateLimiter = new ServerRateLimiter({
      maxConcurrent: 1,
      minInterval: 5000, // Change from 4000 to 5000 (12 RPM max)
    })
  }
  return geminiRateLimiter
}
```

### Reduce retry attempts
```typescript
// In lib/retry-utils.ts
export const GEMINI_RETRY_CONFIG: RetryConfig = {
  maxRetries: 0, // Change from 1 to 0 (no retries, fail immediately)
  initialDelayMs: 5000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}
```

## Monitoring & Debugging

### Check Logs
Server logs will show:
```
[Retry] Rate limit hit. Retry #1/1 after 5000ms
[score-essay] Raw error details: { status: 429, responseStatus: ..., responseData: ..., message: "...", timestamp: "..." }
```

### Verify API Key & Project
1. Go to Google AI Studio → API Keys
2. Confirm you're using the key from the correct project
3. Check `GEMINI_API_KEY` in your `.env.local` matches

### Monitor Usage
1. Visit [Google AI Studio Usage](https://aistudio.google.com/app/apikey)
2. Select correct project in dropdown
3. Check RPM/TPM/RPD usage vs limits
4. Look for spikes or patterns

## Best Practices

### Frontend (Client-Side)
- Use **debouncing** for user input that triggers API calls
- Don't send requests on every keystroke
- Cache responses when possible
- Show loading indicators while requests are queued

### Backend (Server-Side)
- Always use `withRateLimit()` for AI calls
- Include `retryWithBackoff()` for resilience
- Log errors with context for debugging
- Return helpful error messages to users

### General
- Set up billing if using heavily (avoids free tier limits)
- Request quota increases if needed
- Monitor usage regularly
- Use most efficient models (e.g., flash vs pro)

## Troubleshooting

### Still getting quota errors?

1. **Check which model you're using**
   - Different models have different limits
   - Free tier may have stricter limits
   
2. **Verify project settings**
   - Make sure GEMINI_API_KEY matches the project you're viewing in dashboard
   - Check if billing is enabled
   
3. **Look for other quota types**
   - Monthly limits
   - Account-wide limits
   - Regional restrictions
   
4. **Contact Google Support**
   - Request quota increase
   - Report if limits seem incorrect

### Request taking too long?

This is expected! With rate limiting:
- First request: Immediate
- Second request: 4+ seconds wait
- Third request: 4+ seconds wait
- etc.

This is intentional to prevent quota exhaustion.

## Summary

The rate limiting implementation ensures:
✅ No simultaneous API calls  
✅ Minimum 4s between requests (15 RPM max)
✅ Minimal retry strategy (1 retry max)
✅ Better error detection and logging
✅ Detailed logging for debugging  

This should significantly reduce quota exceeded errors while providing a stable user experience.

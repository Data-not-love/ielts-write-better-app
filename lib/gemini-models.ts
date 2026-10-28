// Chat-capable Gemini text models. Pro models are excluded (no free-tier quota), as are
// image/tts/embedding variants and generations older than 3 (retired for new API keys).
const CHAT_MODEL_PATTERN = /^gemini-(\d+(?:\.\d+)*)-flash(-lite)?$/
const MIN_MAJOR_VERSION = 3

function parseChatModel(id: string) {
  const match = id.match(CHAT_MODEL_PATTERN)
  if (!match) return null
  return { version: match[1].split(".").map(Number), lite: Boolean(match[2]) }
}

export function isChatModelId(id: string): boolean {
  const parsed = parseChatModel(id)
  return parsed !== null && parsed.version[0] >= MIN_MAJOR_VERSION
}

/**
 * Sort comparator putting the best model first: newest version, then full flash before lite.
 * Only call with ids that pass isChatModelId().
 */
export function compareChatModels(a: string, b: string): number {
  const pa = parseChatModel(a)!
  const pb = parseChatModel(b)!
  for (let i = 0; i < Math.max(pa.version.length, pb.version.length); i++) {
    const diff = (pb.version[i] ?? 0) - (pa.version[i] ?? 0)
    if (diff !== 0) return diff
  }
  return Number(pa.lite) - Number(pb.lite)
}

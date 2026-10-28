/**
 * IELTS Writing topic list shared by the prompts library (client) and the
 * generate-prompts route (server allowlist). Names double as prompt tags.
 */
export const IELTS_TOPICS = [
  "Technology",
  "Education",
  "Environment",
  "Health",
  "Society",
  "Government",
  "Economy",
  "Culture",
  "Science",
  "Transportation",
  "Business and Money",
  "Communication and Personality",
  "Crime and Punishment",
  "Arts",
  "Family and Children",
  "Tourism",
  "Reading",
  "Food and Diet",
  "Sport and Exercise",
  "Space Exploration",
  "Media and Advertising",
  "Work",
  "Politics and Philosophy",
  "Law",
] as const

export type IeltsTopic = (typeof IELTS_TOPICS)[number]

const byLowercase = new Map<string, IeltsTopic>(IELTS_TOPICS.map((t) => [t.toLowerCase(), t]))

/** Maps any casing of a known topic to its canonical name; unknown values return undefined. */
export function toIeltsTopic(value: unknown): IeltsTopic | undefined {
  return typeof value === "string" ? byLowercase.get(value.trim().toLowerCase()) : undefined
}

/** Case-insensitive check that a prompt's tags include a topic. */
export function tagsIncludeTopic(tags: readonly string[], topic: string): boolean {
  const target = topic.toLowerCase()
  return tags.some((tag) => tag.trim().toLowerCase() === target)
}

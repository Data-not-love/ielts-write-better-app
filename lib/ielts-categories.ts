/**
 * IELTS Writing question types ("categories"), grouped by task. Shared by the
 * prompts library (client) and the generate-prompts route (server allowlist).
 */
export const CATEGORY_GROUPS = [
  {
    task: "Task 1",
    label: "Diagrams with data",
    items: ["Bar Charts", "Line Charts", "Mixed Charts", "Pie Charts", "Table Charts"],
  },
  { task: "Task 1", label: "Diagrams without data", items: ["Map", "Process"] },
  {
    task: "Task 2",
    label: "Essay types",
    items: ["Advantage & Disadvantage", "Cause - Effect - Solution", "Discussion Essay", "Opinion", "Two-part Question"],
  },
] as const

export type TaskType = (typeof CATEGORY_GROUPS)[number]["task"]
export type IeltsCategory = (typeof CATEGORY_GROUPS)[number]["items"][number]

export const IELTS_CATEGORIES: readonly IeltsCategory[] = CATEGORY_GROUPS.flatMap((g) => g.items)

const taskByCategory = new Map<string, TaskType>(CATEGORY_GROUPS.flatMap((g) => g.items.map((c) => [c, g.task] as const)))
const byLowercase = new Map<string, IeltsCategory>(IELTS_CATEGORIES.map((c) => [c.toLowerCase(), c]))

/** Maps any casing of a known category to its canonical name; unknown values return undefined. */
export function toIeltsCategory(value: unknown): IeltsCategory | undefined {
  return typeof value === "string" ? byLowercase.get(value.trim().toLowerCase()) : undefined
}

export function taskOfCategory(category: IeltsCategory): TaskType {
  return taskByCategory.get(category)!
}

/** Categories that belong to a task tab; "all" (or anything else) returns every category. */
export function categoriesForTask(task: string | null | undefined): readonly IeltsCategory[] {
  return task === "Task 1" || task === "Task 2" ? IELTS_CATEGORIES.filter((c) => taskByCategory.get(c) === task) : IELTS_CATEGORIES
}

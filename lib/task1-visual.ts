import { z } from "zod"

/**
 * Task 1 visuals: the chart, table, map or process a Task 1 prompt is about.
 *
 * The model fills a flat, Gemini-friendly schema (`visualGenerationSchema`);
 * `parseVisual` validates it and turns it into the strict `Task1Visual` union
 * that the UI renders, Firestore stores and the grader reads.
 *
 * Stored shape is versioned. Never change v1 in place: old tasks are drawn from it.
 * Firestore rules this shape respects: no nested arrays, no undefined values.
 */

export const VISUAL_VERSION = 1

const MAX_LABEL = 60
const MAX_TITLE = 160

// ---------- Generation schema (what the model returns) ----------
// One optional block per kind, with every field inside a block required: once the
// model picks a block, constrained decoding forces it to fill the data completely.

const MAP_POSITIONS = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"] as const

const genBarLine = z
  .object({
    unit: z.string().describe('Unit of the values, e.g. "%", "million tonnes"'),
    xLabels: z.array(z.string()).min(3).max(8).describe("Categories on the x axis, e.g. years or countries"),
    series: z
      .array(z.object({ name: z.string(), values: z.array(z.number()).describe("One number per xLabel, same order") }))
      .min(1)
      .max(4),
  })
  .describe("Data for a bar chart or line graph")

const genPie = z
  .object({
    pies: z
      .array(
        z.object({
          label: z.string().describe("What this pie shows, e.g. a year"),
          slices: z.array(z.object({ label: z.string(), value: z.number().describe("Percentage") })).min(3).max(6),
        }),
      )
      .min(1)
      .max(2)
      .describe("Each pie's slice values sum to exactly 100"),
  })
  .describe("Data for one or two pie charts")

const genTable = z
  .object({
    unit: z.string().describe('Unit of the numbers, or "" if mixed'),
    columns: z.array(z.string()).min(2).max(6),
    rows: z
      .array(z.object({ label: z.string(), cells: z.array(z.string()).describe("Exactly one cell per column") }))
      .min(2)
      .max(6),
  })
  .describe("Data for a table")

const genChartPart = z.object({
  kind: z.enum(["bar", "line", "pie", "table"]),
  title: z.string(),
  barOrLine: genBarLine.optional().describe('Required when kind is "bar" or "line"'),
  pie: genPie.optional().describe('Required when kind is "pie"'),
  table: genTable.optional().describe('Required when kind is "table"'),
})

const genMapPeriod = z.object({
  label: z.string().describe("The year shown, e.g. 1990"),
  features: z
    .array(
      z.object({
        place: z.string().describe('Short place name, e.g. "Farmland", "Car park"'),
        position: z.enum(MAP_POSITIONS).describe("Compass area of the map; C is the centre"),
      }),
    )
    .min(4)
    .max(9)
    .describe("Each position used at most once"),
})

export const visualGenerationSchema = z.object({
  kind: z.enum(["bar", "line", "pie", "table", "mixed", "process", "map"]),
  title: z.string().describe("Title printed above the visual"),
  barOrLine: genBarLine.optional().describe('Required when kind is "bar" or "line"'),
  pie: genPie.optional().describe('Required when kind is "pie"'),
  table: genTable.optional().describe('Required when kind is "table"'),
  mixed: z
    .object({ parts: z.array(genChartPart).min(2).max(2).describe("Two charts of different kinds") })
    .optional()
    .describe('Required when kind is "mixed"'),
  process: z
    .object({
      steps: z
        .array(z.object({ label: z.string().describe("2-5 words"), detail: z.string().describe('Short detail, or ""') }))
        .min(5)
        .max(10),
      cyclic: z.boolean().describe("True when the last stage leads back to the first"),
    })
    .optional()
    .describe('Required when kind is "process"'),
  map: z
    .object({ before: genMapPeriod, after: genMapPeriod })
    .optional()
    .describe('Required when kind is "map"'),
})

export type GeneratedVisual = z.infer<typeof visualGenerationSchema>

type GenChartPart = z.infer<typeof genChartPart>

/** Maps a chart block from the generation schema onto the stored field layout. */
function chartFromGenerated(kind: string, title: string, g: Partial<Pick<GenChartPart, "barOrLine" | "pie" | "table">>) {
  if (kind === "bar" || kind === "line") return { kind, title, ...g.barOrLine }
  if (kind === "pie") return { kind, title, ...g.pie }
  if (kind === "table") return { kind, title, ...g.table }
  return { kind, title }
}

/**
 * Converts model output into the stored layout, for `parseVisual` to validate.
 * Nothing here is trusted: missing blocks just produce an object that fails validation.
 */
export function fromGenerated(g: GeneratedVisual | undefined): unknown {
  if (!g) return undefined
  switch (g.kind) {
    case "mixed":
      return { kind: "mixed", title: g.title, parts: (g.mixed?.parts ?? []).map((p) => chartFromGenerated(p.kind, p.title, p)) }
    case "process":
      return { kind: "process", title: g.title, steps: g.process?.steps, cyclic: g.process?.cyclic }
    case "map": {
      const toCells = (period?: z.infer<typeof genMapPeriod>) => {
        const cells: string[] = Array(9).fill("")
        for (const f of period?.features ?? []) {
          const i = MAP_POSITIONS.indexOf(f.position)
          if (i >= 0 && !cells[i]) cells[i] = f.place
        }
        return { label: period?.label, cells }
      }
      return { kind: "map", title: g.title, before: toCells(g.map?.before), after: toCells(g.map?.after) }
    }
    default:
      return chartFromGenerated(g.kind, g.title, g)
  }
}

// ---------- Stored / rendered shape ----------

export type Series = { name: string; values: number[] }
export type PieChartData = { label: string; slices: { label: string; value: number }[] }
export type TableRow = { label: string; cells: string[] }

export type BarOrLine = { kind: "bar" | "line"; title: string; unit: string; xLabels: string[]; series: Series[] }
export type PieVisual = { kind: "pie"; title: string; unit: string; pies: PieChartData[] }
export type TableVisual = { kind: "table"; title: string; unit: string; columns: string[]; rows: TableRow[] }
export type ChartPart = BarOrLine | PieVisual | TableVisual

export type MapPeriod = { label: string; cells: string[] } // 9 cells, row by row, "" = empty land
export type ProcessStep = { label: string; detail: string }

export type Task1Visual = { version: typeof VISUAL_VERSION } & (
  | ChartPart
  | { kind: "mixed"; title: string; parts: ChartPart[] }
  | { kind: "process"; title: string; steps: ProcessStep[]; cyclic: boolean }
  | { kind: "map"; title: string; before: MapPeriod; after: MapPeriod }
)

export type VisualKind = Task1Visual["kind"]

/** Category names (see lib/ielts-categories.ts) for each visual kind */
export const CATEGORY_BY_KIND: Record<VisualKind, string> = {
  bar: "Bar Charts",
  line: "Line Charts",
  pie: "Pie Charts",
  table: "Table Charts",
  mixed: "Mixed Charts",
  map: "Map",
  process: "Process",
}

// ---------- Validation ----------

class VisualError extends Error {}

const text = (v: unknown, max = MAX_LABEL, what = "label"): string => {
  if (typeof v !== "string" || !v.trim()) throw new VisualError(`missing ${what}`)
  const s = v.trim()
  if (s.length > max) throw new VisualError(`${what} too long`)
  return s
}
const optText = (v: unknown, max = MAX_LABEL): string => (typeof v === "string" ? v.trim().slice(0, max) : "")
const num = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new VisualError("non-numeric value")
  return Math.round(v * 100) / 100
}
const between = (n: number, min: number, max: number, what: string) => {
  if (n < min || n > max) throw new VisualError(`${what}: ${n} not in ${min}-${max}`)
}

function parseChartPart(raw: any): ChartPart {
  const title = text(raw?.title, MAX_TITLE, "title")
  const unit = optText(raw?.unit, 40)

  switch (raw?.kind) {
    case "bar":
    case "line": {
      const xLabels = (raw.xLabels ?? []).map((l: unknown) => text(l, 30, "x label"))
      between(xLabels.length, 2, 12, "x labels")
      const series: Series[] = (raw.series ?? []).map((s: any) => ({
        name: text(s?.name, MAX_LABEL, "series name"),
        values: (s?.values ?? []).map(num),
      }))
      between(series.length, 1, 6, "series")
      for (const s of series) if (s.values.length !== xLabels.length) throw new VisualError("series length != x labels")
      if (raw.kind === "line" && xLabels.length < 3) throw new VisualError("line needs 3+ points")
      return { kind: raw.kind, title, unit, xLabels, series }
    }
    case "pie": {
      const pies: PieChartData[] = (raw.pies ?? []).map((p: any) => ({
        label: optText(p?.label, 40),
        slices: (p?.slices ?? []).map((s: any) => ({ label: text(s?.label, 40, "slice"), value: num(s?.value) })),
      }))
      between(pies.length, 1, 3, "pies")
      for (const p of pies) {
        between(p.slices.length, 3, 8, "slices")
        if (p.slices.some((s) => s.value < 0)) throw new VisualError("negative slice")
        const total = p.slices.reduce((t, s) => t + s.value, 0)
        between(Math.round(total), 98, 102, "pie total")
      }
      return { kind: "pie", title, unit: unit || "%", pies }
    }
    case "table": {
      const columns = (raw.columns ?? []).map((c: unknown) => text(c, 40, "column"))
      between(columns.length, 2, 7, "columns")
      const rows: TableRow[] = (raw.rows ?? []).map((r: any) => ({
        label: text(r?.label, 50, "row label"),
        cells: (r?.cells ?? []).map((c: unknown) => text(String(c ?? ""), 30, "cell")),
      }))
      between(rows.length, 2, 10, "rows")
      for (const r of rows) if (r.cells.length !== columns.length) throw new VisualError("row length != columns")
      return { kind: "table", title, unit, columns, rows }
    }
    default:
      throw new VisualError(`unknown chart kind ${raw?.kind}`)
  }
}

function parseMapPeriod(raw: any): MapPeriod {
  const cells = (raw?.cells ?? []).map((c: unknown) => optText(c, 30))
  if (cells.length !== 9) throw new VisualError("map needs 9 cells")
  if (cells.filter(Boolean).length < 3) throw new VisualError("map too empty")
  return { label: text(raw?.label, 30, "map period"), cells }
}

/** Validates model output or stored data. Returns null (with a reason) instead of throwing. */
export function parseVisual(raw: unknown): { visual: Task1Visual; error?: undefined } | { visual: null; error: string } {
  try {
    const r = raw as any
    let body: Task1Visual
    switch (r?.kind) {
      case "mixed": {
        const parts = (r.parts ?? []).map(parseChartPart)
        between(parts.length, 2, 2, "mixed parts")
        if (parts[0].kind === parts[1].kind) throw new VisualError("mixed parts must differ")
        body = { version: VISUAL_VERSION, kind: "mixed", title: text(r.title, MAX_TITLE, "title"), parts }
        break
      }
      case "process": {
        const steps: ProcessStep[] = (r.steps ?? []).map((s: any) => ({ label: text(s?.label, 50, "step"), detail: optText(s?.detail, 90) }))
        between(steps.length, 4, 12, "steps")
        body = { version: VISUAL_VERSION, kind: "process", title: text(r.title, MAX_TITLE, "title"), steps, cyclic: r.cyclic === true }
        break
      }
      case "map": {
        const before = parseMapPeriod(r.before)
        const after = parseMapPeriod(r.after)
        if (before.cells.every((c, i) => c === after.cells[i])) throw new VisualError("map periods identical")
        body = { version: VISUAL_VERSION, kind: "map", title: text(r.title, MAX_TITLE, "title"), before, after }
        break
      }
      default:
        body = { version: VISUAL_VERSION, ...parseChartPart(r) }
    }
    if (JSON.stringify(body).length > 10_000) throw new VisualError("visual too large")
    return { visual: body }
  } catch (e) {
    return { visual: null, error: e instanceof Error ? e.message : String(e) }
  }
}

// ---------- Plain-text rendering for the grader ----------

function chartPartToText(p: ChartPart): string {
  const unit = p.unit ? ` (unit: ${p.unit})` : ""
  if (p.kind === "bar" || p.kind === "line") {
    const lines = p.series.map((s) => `  ${s.name}: ${s.values.map((v, i) => `${p.xLabels[i]}=${v}`).join(", ")}`)
    return `${p.kind === "bar" ? "Bar chart" : "Line graph"}: ${p.title}${unit}\n${lines.join("\n")}`
  }
  if (p.kind === "pie") {
    const lines = p.pies.map((pie) => `  ${pie.label || "Pie"}: ${pie.slices.map((s) => `${s.label}=${s.value}`).join(", ")}`)
    return `Pie chart(s): ${p.title}${unit}\n${lines.join("\n")}`
  }
  const header = `  Columns: ${p.columns.join(" | ")}`
  const rows = p.rows.map((r) => `  ${r.label}: ${r.cells.join(" | ")}`)
  return `Table: ${p.title}${unit}\n${header}\n${rows.join("\n")}`
}

/** Readable, complete dump of the visual's data for model prompts. */
export function visualToText(v: Task1Visual): string {
  switch (v.kind) {
    case "mixed":
      return `Two linked visuals: ${v.title}\n${v.parts.map(chartPartToText).join("\n")}`
    case "process":
      return `Process diagram: ${v.title}${v.cyclic ? " (cyclical: the last stage returns to the first)" : ""}\n${v.steps
        .map((s, i) => `  ${i + 1}. ${s.label}${s.detail ? ` - ${s.detail}` : ""}`)
        .join("\n")}`
    case "map": {
      const grid = (p: MapPeriod) =>
        ["north", "middle", "south"]
          .map((row, r) => `    ${row}: ${["west", "centre", "east"].map((col, c) => `${col}=${p.cells[r * 3 + c] || "(empty)"}`).join(", ")}`)
          .join("\n")
      return `Two maps: ${v.title}\n  ${v.before.label}:\n${grid(v.before)}\n  ${v.after.label}:\n${grid(v.after)}`
    }
    default:
      return chartPartToText(v)
  }
}

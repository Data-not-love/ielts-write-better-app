"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { parseVisual, visualToText, type ChartPart, type MapPeriod, type Task1Visual } from "@/lib/task1-visual"

/*
 * Draws a Task 1 visual the way an IELTS paper prints it: white paper, black
 * text, a fixed muted palette. It deliberately ignores the app theme and accent,
 * so the figure looks the same in light and dark mode.
 */

const INK = "#1c1c1c"
const RULE = "#d4d4d4"
const PALETTE = ["#1f4e79", "#8db4dc", "#7a7a7a", "#c9772e", "#4f7f4a", "#a54a46"]

type Props = { visual: unknown; compact?: boolean; className?: string }

/** Renders a stored or freshly generated visual; anything that fails validation renders nothing. */
export function Task1VisualView({ visual, compact = false, className }: Props) {
  const parsed = useMemo(() => parseVisual(visual).visual, [visual])
  if (!parsed) return null

  return (
    <figure
      className={cn("rounded-md border bg-white p-3 text-[#1c1c1c] sm:p-4", compact && "p-2 sm:p-2", className)}
      style={{ borderColor: RULE }}
    >
      <figcaption className={cn("mb-2 text-center font-semibold", compact ? "text-xs" : "text-sm")}>{parsed.title}</figcaption>
      <VisualBody visual={parsed} compact={compact} />
      <p className="sr-only">{visualToText(parsed)}</p>
    </figure>
  )
}

function VisualBody({ visual, compact }: { visual: Task1Visual; compact: boolean }) {
  switch (visual.kind) {
    case "mixed":
      return (
        <div className={cn("grid gap-3", compact ? "grid-cols-2" : "md:grid-cols-2")}>
          {visual.parts.map((part, i) => (
            <div key={i}>
              <p className={cn("mb-1 text-center font-medium", compact ? "text-[10px]" : "text-xs")}>{part.title}</p>
              <ChartPartView part={part} compact={compact} />
            </div>
          ))}
        </div>
      )
    case "process":
      return <ProcessView steps={visual.steps} cyclic={visual.cyclic} compact={compact} />
    case "map":
      return <MapView before={visual.before} after={visual.after} compact={compact} />
    default:
      return <ChartPartView part={visual} compact={compact} />
  }
}

const axisTick = (compact: boolean) => ({ fill: INK, fontSize: compact ? 9 : 12 })

function ChartPartView({ part, compact }: { part: ChartPart; compact: boolean }) {
  const height = compact ? 140 : 300

  if (part.kind === "table") {
    return (
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-center tabular-nums", compact ? "text-[10px]" : "text-sm")}>
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left font-semibold" style={{ borderColor: INK }}>
                {part.unit ? `(${part.unit})` : ""}
              </th>
              {part.columns.map((c) => (
                <th key={c} className="border px-2 py-1 font-semibold" style={{ borderColor: INK }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {part.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="border px-2 py-1 text-left font-medium" style={{ borderColor: INK }}>
                  {r.label}
                </th>
                {r.cells.map((cell, i) => (
                  <td key={i} className="border px-2 py-1" style={{ borderColor: INK }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (part.kind === "pie") {
    const legend = part.pies[0]?.slices.map((s) => s.label) ?? []
    return (
      <div>
        <div className={cn("grid gap-2", part.pies.length > 1 && "grid-cols-2")}>
          {part.pies.map((pie) => (
            <div key={pie.label}>
              <ResponsiveContainer width="100%" height={compact ? 120 : 220}>
                <PieChart>
                  <Pie
                    data={pie.slices}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={compact ? "85%" : "75%"}
                    isAnimationActive={false}
                    stroke="#ffffff"
                    label={compact ? false : ({ value }) => `${value}%`}
                    labelLine={false}
                  >
                    {pie.slices.map((s) => (
                      <Cell key={s.label} fill={PALETTE[legend.indexOf(s.label) >= 0 ? legend.indexOf(s.label) : 0] ?? PALETTE[0]} />
                    ))}
                  </Pie>
                  {!compact && <Tooltip formatter={(v) => `${v}%`} />}
                </PieChart>
              </ResponsiveContainer>
              {pie.label && <p className={cn("text-center font-medium", compact ? "text-[10px]" : "text-xs")}>{pie.label}</p>}
            </div>
          ))}
        </div>
        <SwatchLegend labels={legend} compact={compact} />
      </div>
    )
  }

  // Bar and line charts share one data shape: a row per x label, a key per series
  const data = part.xLabels.map((x, i) => Object.fromEntries([["x", x], ...part.series.map((s) => [s.name, s.values[i]])]))
  const showLegend = part.series.length > 1
  const common = {
    data,
    margin: { top: 8, right: 8, bottom: compact ? 0 : 8, left: compact ? -24 : 0 },
  }
  const axes = (
    <>
      <CartesianGrid stroke={RULE} vertical={false} />
      <XAxis dataKey="x" tick={axisTick(compact)} stroke={INK} interval={0} />
      <YAxis tick={axisTick(compact)} stroke={INK} width={compact ? 40 : 48} />
      {!compact && <Tooltip />}
    </>
  )

  return (
    <div>
      {/* Units go above the plot: long units ("million tonnes of oil equivalent") don't fit a rotated axis label */}
      {part.unit && <p className={cn("mb-1", compact ? "text-[9px]" : "text-xs")}>({part.unit})</p>}
      <ResponsiveContainer width="100%" height={height}>
        {part.kind === "bar" ? (
          <BarChart {...common}>
            {axes}
            {part.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} isAnimationActive={false} />
            ))}
          </BarChart>
        ) : (
          <LineChart {...common}>
            {axes}
            {part.series.map((s, i) => (
              <Line
                key={s.name}
                dataKey={s.name}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: compact ? 1.5 : 3 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
      {showLegend && <SwatchLegend labels={part.series.map((s) => s.name)} compact={compact} />}
    </div>
  )
}

function SwatchLegend({ labels, compact }: { labels: string[]; compact: boolean }) {
  return (
    <ul className={cn("mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1", compact ? "text-[10px]" : "text-xs")}>
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
          {l}
        </li>
      ))}
    </ul>
  )
}

function ProcessView({ steps, cyclic, compact }: { steps: { label: string; detail: string }[]; cyclic: boolean; compact: boolean }) {
  return (
    <div>
      <ol className={cn("flex flex-wrap items-stretch gap-y-3", compact ? "gap-x-1" : "gap-x-2")}>
        {steps.map((s, i) => (
          <li key={i} className="flex items-center">
            <div
              className={cn("rounded border bg-white", compact ? "max-w-[7rem] px-1.5 py-1" : "max-w-[11rem] px-3 py-2")}
              style={{ borderColor: INK }}
            >
              <p className={cn("font-semibold", compact ? "text-[10px]" : "text-sm")}>
                <span className="tabular-nums">{i + 1}.</span> {s.label}
              </p>
              {!compact && s.detail && <p className="mt-1 text-xs leading-snug text-[#4a4a4a]">{s.detail}</p>}
            </div>
            {i < steps.length - 1 && (
              <span className={cn("px-1", compact ? "text-xs" : "text-lg")} aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      {cyclic && (
        <p className={cn("mt-2 text-center italic", compact ? "text-[10px]" : "text-xs")}>
          ↺ Step {steps.length} leads back to step 1
        </p>
      )}
    </div>
  )
}

const COMPASS = ["NW", "N", "NE", "W", "Centre", "E", "SW", "S", "SE"]

function MapView({ before, after, compact }: { before: MapPeriod; after: MapPeriod; compact: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[before, after].map((period) => (
        <div key={period.label}>
          <p className={cn("mb-1 text-center font-semibold", compact ? "text-[10px]" : "text-sm")}>{period.label}</p>
          <div className="relative">
            <span className={cn("absolute -top-0.5 right-1 font-semibold", compact ? "text-[9px]" : "text-xs")} aria-hidden="true">
              N↑
            </span>
            <div className="grid grid-cols-3 border" style={{ borderColor: INK }}>
              {period.cells.map((cell, i) => (
                <div
                  key={i}
                  title={COMPASS[i]}
                  className={cn(
                    "flex items-center justify-center border text-center leading-tight",
                    compact ? "min-h-8 p-0.5 text-[9px]" : "min-h-16 p-1.5 text-xs",
                    cell ? "bg-[#eef3f8] font-medium" : "bg-white text-[#9a9a9a]",
                  )}
                  style={{ borderColor: RULE }}
                >
                  {cell || (compact ? "" : "—")}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

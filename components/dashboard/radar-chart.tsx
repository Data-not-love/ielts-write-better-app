"use client"

import type { CriterionKey } from "@/types/tasks"
import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface RadarChartProps {
  scores?: Partial<Record<CriterionKey, number>>
  target?: number
  beforeScores?: Partial<Record<CriterionKey, number>>
  isLoading?: boolean
}

const CRITERIA_ORDER: CriterionKey[] = ["TR", "CC", "LR", "GRA"]

const CRITERIA_FULL_NAMES: Record<CriterionKey, string> = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

// Vibrant color palette for each criterion
const CRITERIA_COLORS: Record<CriterionKey, { stroke: string; fill: string }> = {
  TR: {
    stroke: "rgba(79, 70, 229, 1)",      // Indigo
    fill: "rgba(79, 70, 229, 0.25)"
  },
  CC: {
    stroke: "rgba(34, 197, 94, 1)",      // Emerald
    fill: "rgba(34, 197, 94, 0.25)"
  },
  LR: {
    stroke: "rgba(249, 115, 22, 1)",     // Orange
    fill: "rgba(249, 115, 22, 0.25)"
  },
  GRA: {
    stroke: "rgba(236, 72, 153, 1)",     // Pink
    fill: "rgba(236, 72, 153, 0.25)"
  }
}

export function RadarChart({ scores, isLoading }: RadarChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground">
        Loading your performance…
      </div>
    )
  }

  const hasScores = CRITERIA_ORDER.some((criterion) => typeof scores?.[criterion] === "number")

  if (!hasScores) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-center text-sm text-muted-foreground">
        Submit a task to see your IELTS criteria breakdown.
      </div>
    )
  }

  // Axis ticks use the short codes so they fit on a phone; the legend carries the full names
  const data = CRITERIA_ORDER.map((criterion) => ({
    criteria: criterion,
    [criterion]: scores?.[criterion] ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={data} outerRadius="70%">
        {/* Grid with light gray color */}
        <PolarGrid stroke="#E5E7EB" strokeWidth={1} />
        
        {/* Axis labels with dark gray color */}
        <PolarAngleAxis 
          dataKey="criteria" 
          tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }} 
        />
        
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 9]} 
          tick={{ fill: "#6B7280", fontSize: 11 }}
          tickCount={10}
        />
        
        {/* Each criterion rendered as a separate colored radar area */}
        {CRITERIA_ORDER.map((criterion) => {
          const colors = CRITERIA_COLORS[criterion]
          return (
            <Radar
              key={criterion}
              name={CRITERIA_FULL_NAMES[criterion]}
              dataKey={criterion}
              stroke={colors.stroke}
              fill={colors.fill}
              strokeWidth={2.5}
              dot={{ fill: colors.stroke, r: 4 }}
            />
          )
        })}
        
        <Legend 
          wrapperStyle={{ paddingTop: "10px" }}
          iconType="circle"
          formatter={(value) => <span className="text-sm font-medium">{value}</span>}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}

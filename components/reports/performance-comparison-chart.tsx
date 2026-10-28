"use client"

import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

type ChartRow = { shortName: string; Current: number; Before?: number }
type TooltipContent = {
  active?: boolean
  payload?: ReadonlyArray<{ color?: string; name?: string | number; value?: unknown; payload?: ChartRow }>
}
type BarLabel = { x?: number | string; y?: number | string; width?: number | string; value?: unknown; dataKey?: unknown; payload?: ChartRow }

interface PerformanceComparisonChartProps {
  beforeScores?: {
    TR: number
    CC: number
    LR: number
    GRA: number
  }
  currentScores: {
    TR: number
    CC: number
    LR: number
    GRA: number
  }
  showLabels?: boolean
}

// Color scheme from the requirements
const BEFORE_COLOR = "var(--chart-1)" // Purple-pink for Before/Pre-test
const CURRENT_COLOR = "var(--chart-2)" // Orange for Now/Current
const GRID_COLOR = "var(--border)" // Light gray transparent
const BORDER_COLOR = "var(--muted-foreground)" // White transparent border

// Full criterion names
const CRITERIA_NAMES = {
  TR: "Task Achievement / Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammatical Range & Accuracy"
}

// Short names for display
const CRITERIA_SHORT_NAMES: Record<keyof typeof CRITERIA_NAMES, string> = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

// Helper to format improvement areas
function formatImprovementAreas(improvements: Record<string, number>): string {
  return Object.entries(improvements)
    .filter(([, val]) => val < 0)
    .map(([key, val]) => `${key} (${val.toFixed(2)})`)
    .join(', ')
}

export function PerformanceComparisonChart({ 
  beforeScores,
  currentScores,
  showLabels = true 
}: PerformanceComparisonChartProps) {
  // Prepare data for grouped bar chart
  const data = [
    {
      name: "Task Achievement /\nResponse",
      shortName: "TR",
      Before: beforeScores?.TR || 0,
      Current: currentScores.TR,
    },
    {
      name: "Coherence &\nCohesion",
      shortName: "CC",
      Before: beforeScores?.CC || 0,
      Current: currentScores.CC,
    },
    {
      name: "Lexical\nResource",
      shortName: "LR",
      Before: beforeScores?.LR || 0,
      Current: currentScores.LR,
    },
    {
      name: "Grammatical Range\n& Accuracy",
      shortName: "GRA",
      Before: beforeScores?.GRA || 0,
      Current: currentScores.GRA,
    },
  ]

  // Calculate improvement
  const calculateImprovement = () => {
    if (!beforeScores) return null
    
    const improvements = {
      TR: currentScores.TR - beforeScores.TR,
      CC: currentScores.CC - beforeScores.CC,
      LR: currentScores.LR - beforeScores.LR,
      GRA: currentScores.GRA - beforeScores.GRA,
    }
    
    const averageImprovement = (improvements.TR + improvements.CC + improvements.LR + improvements.GRA) / 4
    const maxImprovement = Math.max(...Object.values(improvements))
    const minImprovement = Math.min(...Object.values(improvements))
    const maxCriterion = Object.entries(improvements).find(([, val]) => val === maxImprovement)?.[0]
    
    return { improvements, averageImprovement, maxImprovement, minImprovement, maxCriterion }
  }

  const improvementInfo = calculateImprovement()

  // Tooltip renderer: a plain function (not a component) so it is not re-created as a new component type each render
  const renderTooltip = ({ active, payload }: TooltipContent) => {
    const data = payload?.[0]?.payload
    if (active && payload && data) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2 text-sm text-foreground">{CRITERIA_NAMES[data.shortName as keyof typeof CRITERIA_NAMES]}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">{Number(entry.value).toFixed(1)}</span>
            </div>
          ))}
          {beforeScores && data.Before !== undefined && (
            <div className="mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Improvement: <span className={`font-semibold ${data.Current - data.Before >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {data.Current - data.Before >= 0 ? '+' : ''}{(data.Current - data.Before).toFixed(1)}
                </span>
              </span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Custom label renderer with improvement indicators
  const renderCustomLabel = (props: BarLabel) => {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const width = Number(props.width ?? 0)
    const value = Number(props.value ?? 0)
    const { dataKey } = props
    if (!showLabels || value === 0) return null
    
    // Show improvement delta for Current bars
    if (dataKey === 'Current' && beforeScores) {
      const criterionShortName = props.payload?.shortName as keyof typeof beforeScores
      const beforeValue = beforeScores[criterionShortName]
      const improvement = value - beforeValue
      const improvementText = improvement >= 0 ? `+${improvement.toFixed(1)}` : improvement.toFixed(1)
      const color = improvement > 0 ? "var(--success)" : improvement < 0 ? "var(--destructive)" : "var(--muted-foreground)"
      
      return (
        <g>
          <text
            x={x + width / 2}
            y={y - 20}
            fill="var(--foreground)"
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
          >
            {value.toFixed(1)}
          </text>
          <text
            x={x + width / 2}
            y={y - 5}
            fill={color}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
          >
            ({improvementText})
          </text>
        </g>
      )
    }
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="var(--foreground)"
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
      >
        {value.toFixed(1)}
      </text>
    )
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground">
          Your Progress – Performance across IELTS Criteria
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {beforeScores 
            ? "Comparison of your first submission vs current average performance across all IELTS criteria"
            : "Your current performance across all IELTS criteria"
          }
        </CardDescription>
        {improvementInfo && (
          <div className="mt-3 space-y-2">
            {improvementInfo.averageImprovement > 0 ? (
              <p className="text-sm text-success font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average improvement: <span className="text-lg">+{improvementInfo.averageImprovement.toFixed(2)} bands</span> across all criteria
              </p>
            ) : improvementInfo.averageImprovement < 0 ? (
              <p className="text-sm text-orange-400 font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Average change: <span className="text-lg">{improvementInfo.averageImprovement.toFixed(2)} bands</span> - keep practicing!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground font-semibold">
                Your scores are stable. Focus on consistent practice for improvement.
              </p>
            )}
            {improvementInfo.maxImprovement > 0 && improvementInfo.maxCriterion && (
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5 text-success" />
                <span>
                  Best improvement: <span className="font-bold text-success">+{improvementInfo.maxImprovement.toFixed(2)} bands</span> in {improvementInfo.maxCriterion} ({CRITERIA_SHORT_NAMES[improvementInfo.maxCriterion as keyof typeof CRITERIA_SHORT_NAMES]})
                </span>
              </p>
            )}
            {improvementInfo.minImprovement < 0 && (
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-400" />
                <span>
                  Areas needing attention: {formatImprovementAreas(improvementInfo.improvements)}
                </span>
              </p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart 
            data={data} 
            margin={{ top: 30, right: 30, left: 10, bottom: 80 }}
            barGap={8}
            barCategoryGap="20%"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={GRID_COLOR}
              vertical={false}
            />
            <XAxis 
              dataKey="name"
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              tickLine={{ stroke: "var(--border)" }}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={80}
            />
            <YAxis
              domain={[4, 9]}
              ticks={[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={{ stroke: "var(--border)" }}
              label={{ 
                value: "Band Score", 
                angle: -90, 
                position: "insideLeft", 
                style: { fill: "var(--foreground)", fontSize: 14, fontWeight: 600 } 
              }}
            />
            <Tooltip 
              content={renderTooltip}
              cursor={{ fill: "var(--muted)" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="rect"
              formatter={(value) => (
                <span className="text-sm font-semibold text-foreground">{value}</span>
              )}
            />
            {beforeScores && (
              <Bar 
                dataKey="Before" 
                fill={BEFORE_COLOR}
                radius={[6, 6, 0, 0]}
                label={renderCustomLabel}
                stroke={BORDER_COLOR}
                strokeWidth={2}
                name="First Submission"
              />
            )}
            <Bar 
              dataKey="Current" 
              fill={CURRENT_COLOR}
              radius={[6, 6, 0, 0]}
              label={renderCustomLabel}
              stroke={BORDER_COLOR}
              strokeWidth={2}
              name="Current Average"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

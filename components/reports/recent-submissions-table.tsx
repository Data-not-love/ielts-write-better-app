"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RecentSubmission } from "@/types/reports"

const CRITERIA_NAMES = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

interface RecentSubmissionsTableProps {
  submissions: RecentSubmission[]
}

export function RecentSubmissionsTable({ submissions }: RecentSubmissionsTableProps) {
  if (submissions.length === 0) {
    return null
  }

  // Calculate summary
  const avgScore = submissions.reduce((sum, s) => sum + s.overallBand, 0) / submissions.length
  const skillCounts = submissions.reduce((acc, s) => {
    acc[s.weakestSkill] = (acc[s.weakestSkill] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostCommonWeakSkill = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as keyof typeof CRITERIA_NAMES | undefined

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Recent Performance</CardTitle>
        <CardDescription>
          Your last {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm">
            <strong>Summary:</strong> Average score <strong>{avgScore.toFixed(1)}</strong>
            {mostCommonWeakSkill && (
              <>
                {", "}most common weak area is{" "}
                <strong>{CRITERIA_NAMES[mostCommonWeakSkill]}</strong>
              </>
            )}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold">Essay</th>
                <th className="text-left py-2 px-2 font-semibold">Task Type</th>
                <th className="text-center py-2 px-2 font-semibold">Score</th>
                <th className="text-left py-2 px-2 font-semibold">Weak Area</th>
                <th className="text-left py-2 px-2 font-semibold hidden md:table-cell">Key Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-2">
                    <p className="font-medium line-clamp-1">{submission.title}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant="outline" className="text-xs">
                      {submission.taskType}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-semibold text-lg">{submission.overallBand.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs w-fit whitespace-nowrap">
                        {CRITERIA_NAMES[submission.weakestSkill]}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {submission.weakestSkillScore.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {submission.keySuggestion}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile view for suggestions */}
        <div className="md:hidden space-y-2">
          {submissions.map((submission) => (
            <div key={`mobile-${submission.id}`} className="p-2 rounded-lg bg-muted/30 text-xs">
              <p className="font-medium mb-1">{submission.title}</p>
              <p className="text-muted-foreground">{submission.keySuggestion}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, TrendingUp, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"
import type { RecentSubmission } from "@/types/reports"

const CRITERIA_NAMES = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

interface ImprovementAnalysis {
  submissionId: string
  submissionTitle: string
  weakestSkill: string
  currentScore: number
  targetScore: number
  gap: number
  improvementSuggestions: string
}

interface TargetImprovementAnalysisProps {
  userId: string
  targetBand: number
  recentSubmissions: RecentSubmission[]
}

export function TargetImprovementAnalysis({ 
  userId, 
  targetBand,
  recentSubmissions 
}: TargetImprovementAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [analyses, setAnalyses] = useState<ImprovementAnalysis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const analyzeSubmissions = async () => {
    setLoading(true)
    setError(null)

    try {
      // Analyze up to 5 most recent submissions sequentially to avoid rate limiting
      const submissionsToAnalyze = recentSubmissions.slice(0, 5)
      const results: ImprovementAnalysis[] = []
      
      for (const submission of submissionsToAnalyze) {
        const response = await fetch("/api/reports/analyze-submission-gap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId: submission.id,
            submissionTitle: submission.title,
            weakestSkill: submission.weakestSkill,
            currentScore: submission.weakestSkillScore,
            targetScore: targetBand,
            keySuggestion: submission.keySuggestion
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to analyze submission ${submission.id}`)
        }

        const result = await response.json()
        results.push(result)
      }

      setAnalyses(results)
    } catch (err) {
      console.error("Error analyzing submissions:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze submissions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (recentSubmissions.length > 0) {
      analyzeSubmissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentSubmissions, targetBand])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Recent Submissions Analysis</CardTitle>
          <CardDescription>
            Analyzing your recent work to identify improvement areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Analyzing submissions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Recent Submissions Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
            <Button
              onClick={analyzeSubmissions}
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analyses.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Recent Submissions Analysis</CardTitle>
          <CardDescription>
            Submit essays to get personalized improvement suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions to analyze yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Recent Submissions Analysis</CardTitle>
        </div>
        <CardDescription>
          Specific improvements needed to reach band {targetBand.toFixed(1)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm">
            <strong>Analyzed {analyses.length} recent submission{analyses.length !== 1 ? 's' : ''}</strong>
            {" "}to identify key areas for improvement based on your target score.
          </p>
        </div>

        {/* Individual Analyses */}
        <div className="space-y-3">
          {analyses.map((analysis) => {
            const isExpanded = expandedIds.has(analysis.submissionId)
            
            return (
              <div 
                key={analysis.submissionId}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Header - Always Visible */}
                <button
                  onClick={() => toggleExpanded(analysis.submissionId)}
                  className="w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm">{analysis.submissionTitle}</h3>
                        <Badge variant="outline" className="text-xs">
                          {CRITERIA_NAMES[analysis.weakestSkill as keyof typeof CRITERIA_NAMES]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Current: <strong>{analysis.currentScore.toFixed(1)}</strong></span>
                        <span>Target: <strong>{analysis.targetScore.toFixed(1)}</strong></span>
                        <span className="text-warning">
                          Gap: <strong>+{analysis.gap.toFixed(1)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-border">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Markdown 
                        content={analysis.improvementSuggestions}
                        className="text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Call to Action */}
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-sm text-muted-foreground">
<strong>Next step:</strong> Focus on addressing these issues in your next practice essays. 
            Consistent practice with these improvements will help you reach your target faster.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

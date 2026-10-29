"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authFetch } from "@/lib/auth-fetch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, AlertCircle, Loader2, Filter, ChevronRight } from "lucide-react"
import dynamic from "next/dynamic"
import { useAuth } from "@/components/auth/auth-provider"
import { OverviewCards } from "./overview-cards"
import { TargetSetting } from "./target-setting"
import { TargetRecommendations } from "./target-recommendations"
import { RecentSubmissionsTable } from "./recent-submissions-table"
import { GapToTargetTable } from "./gap-to-target-table"
import { TargetImprovementAnalysis } from "./target-improvement-analysis"
import { Markdown } from "@/components/ui/markdown"
import type { ProgressReportData, UserTarget, CommonIssue } from "@/types/reports"

// Criteria full names for better clarity
// Recharts is heavy; load the charts only when the report renders them
const RadarChart = dynamic(() => import("@/components/dashboard/radar-chart").then((m) => m.RadarChart), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-md bg-muted/40" aria-hidden="true" />,
})
const PerformanceComparisonChart = dynamic(() => import("./performance-comparison-chart").then((m) => m.PerformanceComparisonChart), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-md bg-muted/40" aria-hidden="true" />,
})

const CRITERIA_NAMES = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

interface ProgressReportsProps {
  userId?: string
}

export function ProgressReports({ userId: propUserId }: ProgressReportsProps = {}) {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30")
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all")
  const [reportData, setReportData] = useState<ProgressReportData | null>(null)
  const [userTarget, setUserTarget] = useState<UserTarget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<CommonIssue | null>(null)
  const [improvementSuggestions, setImprovementSuggestions] = useState<string | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const userId = propUserId || user?.uid

  // Fetch user target on mount
  useEffect(() => {
    if (!userId) return
    
    async function fetchTarget() {
      try {
        const response = await authFetch("/api/reports/target")
        if (response.ok) {
          const data = await response.json()
          setUserTarget(data.target)
        }
      } catch (err) {
        console.error("Error fetching target:", err)
      }
    }
    
    fetchTarget()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    fetchReportData()
    // fetchReportData reads exactly these values; it is re-created every render, so it is not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateRange, taskTypeFilter, userTarget])

  async function fetchReportData() {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const response = await authFetch("/api/reports/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          dateRange: parseInt(dateRange),
          taskType: taskTypeFilter === "all" ? undefined : taskTypeFilter,
          targetBand: userTarget?.targetOverallBand
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch report data")
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      console.error("Error fetching report:", err)
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  async function handleIssueClick(issue: CommonIssue) {
    setSelectedIssue(issue)
    setLoadingSuggestions(true)
    setImprovementSuggestions(null)

    try {
      const response = await authFetch("/api/reports/improvement-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueName: issue.name,
          relatedCriterion: issue.relatedCriterion,
          userLevel: reportData?.currentOverallAverage
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch improvement suggestions")
      }

      const data = await response.json()
      setImprovementSuggestions(data.suggestions)
    } catch (err) {
      console.error("Error fetching suggestions:", err)
      setImprovementSuggestions("Failed to load improvement suggestions. Please try again.")
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function handleTargetSaved(target: UserTarget) {
    setUserTarget(target)
  }

  if (!userId) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" id="progress-reports" data-toc-title="Progress Reports">Progress Reports</h1>
          <p className="text-muted-foreground">Track your improvement over time and reach your targets</p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please sign in to view your progress reports.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchReportData}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!reportData) {
    return null
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" id="progress-reports" data-toc-title="Progress Reports">Progress Reports</h1>
        <p className="text-muted-foreground">Track your improvement over time and reach your targets</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center" id="filters" data-toc-title="Filters">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as "7" | "30" | "90")}>
          <TabsList>
            <TabsTrigger value="7">7 days</TabsTrigger>
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          value={taskTypeFilter}
          onChange={(e) => setTaskTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Task Types</option>
          <option value="Task 1">Task 1</option>
          <option value="Task 2">Task 2</option>
        </select>
      </div>

      {reportData.overallScoreTrend.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {reportData.personalizedFeedback.overallSummary}
            </p>
            <p className="text-sm text-muted-foreground">
              Submit and score some essays to see your progress!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="mb-6" id="overview-cards" data-toc-title="Overview">
            <OverviewCards
              currentAverage={reportData.currentOverallAverage}
              bestRecentScore={reportData.bestRecentScore}
              totalSubmissions={reportData.totalSubmissions}
              gapToTarget={
                userTarget 
                  ? userTarget.targetOverallBand - reportData.currentOverallAverage
                  : undefined
              }
            />
          </div>

          {/* Target Setting and Skill Priority */}
          {userId && (
            <div className="space-y-6 mb-6" id="target-skill-priority" data-toc-title="Target & Skills">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <TargetSetting
                    userId={userId}
                    onTargetSaved={handleTargetSaved}
                    currentTarget={userTarget}
                  />
                </div>
                
                {userTarget && reportData.targetBasedRecommendations && (
                  <div className="lg:col-span-2">
                    <GapToTargetTable
                      currentAverage={reportData.currentOverallAverage}
                      targetBand={userTarget.targetOverallBand}
                      skillPriority={reportData.targetBasedRecommendations.skillPriority}
                    />
                  </div>
                )}
              </div>

              {/* Target Improvement Analysis - Recent Submissions */}
              {userTarget && reportData.recentSubmissions && reportData.recentSubmissions.length > 0 && (
                <TargetImprovementAnalysis
                  targetBand={userTarget.targetOverallBand}
                  recentSubmissions={reportData.recentSubmissions}
                />
              )}
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Criteria Radar */}
            <Card className="rounded-2xl border-border bg-card" id="criteria-breakdown" data-toc-title="Criteria Breakdown">
              <CardHeader>
                <CardTitle className="text-xl">Criteria Breakdown</CardTitle>
                <CardDescription className="text-base">Current performance across all criteria</CardDescription>
                <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as "7" | "30" | "90")} className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="7">7 days</TabsTrigger>
                    <TabsTrigger value="30">30 days</TabsTrigger>
                    <TabsTrigger value="90">90 days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <RadarChart 
                  scores={{
                    TR: reportData.criteriaBreakdown.TR,
                    CC: reportData.criteriaBreakdown.CC,
                    LR: reportData.criteriaBreakdown.LR,
                    GRA: reportData.criteriaBreakdown.GRA
                  }}
                  target={userTarget?.targetOverallBand}
                />
              </CardContent>
            </Card>

            {/* Common Issues */}
            <Card className="rounded-2xl border-border bg-card" id="common-issues" data-toc-title="Common Issues">
              <CardHeader>
                <CardTitle className="text-xl">Common Issues</CardTitle>
                <CardDescription className="text-base">Top recurring problems in your writing (click for improvement tips)</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.commonIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No issues identified yet. Keep writing to get more insights!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reportData.commonIssues.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleIssueClick(item)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.relatedCriterion && (
                              <Badge variant="outline" className="text-xs">
                                {item.relatedCriterion}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Occurred {item.count} times</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.trend === "Improving" ? (
                            <>
                              <TrendingDown className="h-4 w-4 text-success" />
                              <Badge variant="success" className="text-xs bg-success/20 text-success border-success/30">
                                Improving
                              </Badge>
                            </>
                          ) : item.trend === "Worsening" ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-destructive" />
                              <Badge variant="destructive" className="text-xs bg-destructive/20 text-destructive border-destructive/30">
                                Worsening
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Stable
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Comparison Chart */}
          {reportData.criteriaBreakdown && reportData.firstSubmissionScores && (
            <div className="mb-6" id="performance-comparison" data-toc-title="Before & After Comparison">
              <PerformanceComparisonChart
                beforeScores={reportData.firstSubmissionScores}
                currentScores={{
                  TR: reportData.criteriaBreakdown.TR,
                  CC: reportData.criteriaBreakdown.CC,
                  LR: reportData.criteriaBreakdown.LR,
                  GRA: reportData.criteriaBreakdown.GRA
                }}
              />
            </div>
          )}

          {/* Recent Performance */}
          <Card className="rounded-2xl border-border bg-card mb-6" id="recent-performance" data-toc-title="Recent Performance">
            <CardHeader>
              <CardTitle className="text-2xl">Recent Performance</CardTitle>
              <CardDescription className="text-base">Your writing activity this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {reportData.practiceTime.hoursThisWeek}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Hours this week</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <div className="text-5xl font-bold text-accent mb-2">
                    {reportData.practiceTime.hoursThisMonth}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Hours this month</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-chart-3/10 border border-chart-3/20">
                  <div className="text-5xl font-bold text-chart-3 mb-2">
                    {reportData.practiceTime.tasksCompleted}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Tasks completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalized Feedback */}
          <Card className="rounded-2xl border-border bg-card" id="personalized-feedback" data-toc-title="Personalized Feedback">
            <CardHeader>
              <CardTitle>Personalized Feedback</CardTitle>
              <CardDescription>AI-generated insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Summary */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Overall Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {reportData.personalizedFeedback.overallSummary}
                </p>
              </div>

              {/* Strengths */}
              {reportData.personalizedFeedback.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Strengths
                  </h3>
                  <ul className="space-y-1">
                    {reportData.personalizedFeedback.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {reportData.personalizedFeedback.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-1">
                    {reportData.personalizedFeedback.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {reportData.personalizedFeedback.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
                  <div className="space-y-3">
                    {reportData.personalizedFeedback.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rec.relatedCriterion}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target-Based Recommendations */}
          {userTarget && reportData.targetBasedRecommendations && (
            <div className="mt-6">
              <TargetRecommendations
                studyPlan={reportData.targetBasedRecommendations.studyPlan}
                repeatedSuggestions={reportData.targetBasedRecommendations.repeatedSuggestions}
              />
            </div>
          )}

          {/* Recent Submissions */}
          {reportData.recentSubmissions && reportData.recentSubmissions.length > 0 && (
            <div className="mt-6">
              <RecentSubmissionsTable submissions={reportData.recentSubmissions} />
            </div>
          )}
        </>
      )}

      {/* Improvement Suggestions Dialog */}
      <Dialog open={selectedIssue !== null} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              How to Improve: {selectedIssue?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIssue?.relatedCriterion && (
                <span>Related to: <strong>{CRITERIA_NAMES[selectedIssue.relatedCriterion as keyof typeof CRITERIA_NAMES]}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Generating personalized improvement tips...</span>
            </div>
          ) : improvementSuggestions ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <Markdown 
                content={improvementSuggestions}
                className="text-sm leading-relaxed"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load suggestions. Please try again.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

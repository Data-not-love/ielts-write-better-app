"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Flame, PenLine, MessageSquare, TrendingUp, Target, Loader2, BookOpen, Lightbulb, AlertCircle } from "lucide-react"

import { TopNav } from "@/components/navigation/top-nav"
import { authFetch } from "@/lib/auth-fetch"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadarChart } from "@/components/dashboard/radar-chart"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { subscribeToTasks } from "@/lib/firebase-firestore"
import { TargetSetting } from "@/components/reports/target-setting"
import { SkillPriorityVisualization } from "@/components/reports/skill-priority-visualization"
import { OverviewCards } from "@/components/reports/overview-cards"
import { PageWithTOC } from "@/components/ui/page-with-toc"
import { Footer } from "@/components/home/footer"
import type { TaskDocument, CriterionKey } from "@/types/tasks"
import type { ProgressReportData, UserTarget, RepeatedSuggestion } from "@/types/reports"

const CRITERIA_ORDER: CriterionKey[] = ["TR", "CC", "LR", "GRA"]

// Criteria full names for better clarity
const CRITERIA_NAMES = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

const formatTimestamp = (value?: TaskDocument["updatedAt"] | TaskDocument["createdAt"]) => {
  if (!value) {
    return "—"
  }

  try {
    const date = "toDate" in (value as any) ? (value as any).toDate() : new Date(value as unknown as string)
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  } catch (error) {
    console.error("[v0] Failed to format dashboard timestamp:", error)
    return "—"
  }
}

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "scored":
      return "success"
    case "submitted":
      return "default"
    case "draft":
      return "outline"
    default:
      return "outline"
  }
}

const toDayString = (value?: TaskDocument["updatedAt"] | TaskDocument["createdAt"]) => {
  if (!value) {
    return null
  }

  try {
    const date = "toDate" in (value as any) ? (value as any).toDate() : new Date(value as unknown as string)
    return date.toISOString().slice(0, 10)
  } catch (error) {
    console.error("[v0] Failed to normalise day string:", error)
    return null
  }
}

const calculatePracticeStreak = (tasks: TaskDocument[]) => {
  if (!tasks.length) {
    return 0
  }

  const uniqueDays = new Set<string>()
  tasks.forEach((task) => {
    const day = toDayString(task.updatedAt || task.createdAt)
    if (day) {
      uniqueDays.add(day)
    }
  })

  if (!uniqueDays.size) {
    return 0
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  const ONE_DAY = 24 * 60 * 60 * 1000

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(today.getTime() - offset * ONE_DAY)
    const dayKey = day.toISOString().slice(0, 10)

    if (uniqueDays.has(dayKey)) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ProgressReportData | null>(null)
  const [userTarget, setUserTarget] = useState<UserTarget | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<RepeatedSuggestion | null>(null)
  const [improvementSuggestions, setImprovementSuggestions] = useState<string | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    if (!user) {
      setTasks([])
      setIsLoading(false)
      setLoadError(null)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    const unsubscribe = subscribeToTasks(
      user.uid,
      (data) => {
        setTasks(data ?? [])
        setIsLoading(false)
        setLoadError(null)
      },
      (error) => {
        console.error("[v0] Dashboard task subscription error:", error)
        setTasks([])
        setIsLoading(false)
        setLoadError("We couldn't load your latest progress. Please try again later.")
      },
    )

    return () => {
      unsubscribe()
    }
  }, [user])

  // Fetch user target on mount
  useEffect(() => {
    if (!user) return
    
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
  }, [user])

  // Fetch report data for enhanced dashboard
  useEffect(() => {
    if (!user) return

    async function fetchReportData() {
      setReportLoading(true)
      try {
        const response = await authFetch("/api/reports/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            dateRange: 30,
            targetBand: userTarget?.targetOverallBand
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setReportData(data)
        }
      } catch (err) {
        console.error("Error fetching report data:", err)
      } finally {
        setReportLoading(false)
      }
    }

    fetchReportData()
  }, [user, userTarget])

  function handleTargetSaved(target: UserTarget) {
    setUserTarget(target)
  }

  async function handleSuggestionClick(suggestion: RepeatedSuggestion) {
    setSelectedSuggestion(suggestion)
    setLoadingSuggestions(true)
    setImprovementSuggestions(null)

    try {
      const response = await authFetch("/api/reports/improvement-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueName: suggestion.suggestion,
          relatedCriterion: suggestion.relatedSkill,
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
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setImprovementSuggestions(`Failed to load improvement suggestions: ${errorMessage}. Please try again or contact support if the issue persists.`)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const latestScoredTask = useMemo(() => {
    return tasks.find((task) => {
      const status = task.status?.toLowerCase()
      const overallBand = task.overallBand ?? task.feedback?.overallBand
      return status === "scored" || typeof overallBand === "number"
    })
  }, [tasks])

  const latestOverallBand = useMemo(() => {
    const band = latestScoredTask?.overallBand ?? latestScoredTask?.feedback?.overallBand
    return typeof band === "number" ? band : null
  }, [latestScoredTask])

  const previousBand = useMemo(() => {
    const previousTask = tasks.find((task) => {
      if (!latestScoredTask || task.id === latestScoredTask.id) {
        return false
      }

      const status = task.status?.toLowerCase()
      const band = task.overallBand ?? task.feedback?.overallBand
      return status === "scored" || typeof band === "number"
    })

    const band = previousTask?.overallBand ?? previousTask?.feedback?.overallBand
    return typeof band === "number" ? band : null
  }, [latestScoredTask, tasks])

  const streak = useMemo(() => calculatePracticeStreak(tasks), [tasks])

  const tasksInProgress = useMemo(() => {
    return tasks.filter((task) => (task.status ?? "").toLowerCase() !== "scored").length
  }, [tasks])

  const recentActivity = useMemo(() => tasks.slice(0, 3), [tasks])

  const radarScores = useMemo(() => {
    // Use aggregated data from reportData if available (shows average across all tasks)
    if (reportData && reportData.criteriaBreakdown) {
      const breakdown = reportData.criteriaBreakdown
      const hasData = CRITERIA_ORDER.some(key => breakdown[key] > 0)
      
      if (hasData) {
        return CRITERIA_ORDER.reduce<Partial<Record<CriterionKey, number>>>((acc, key) => {
          if (breakdown[key] > 0) {
            acc[key] = breakdown[key]
          }
          return acc
        }, {})
      }
    }
    
    // Fallback to latest task if reportData is not available
    const criteria = latestScoredTask?.feedback?.criteria
    if (!criteria) {
      return undefined
    }

    return CRITERIA_ORDER.reduce<Partial<Record<CriterionKey, number>>>((acc, key) => {
      const score = criteria[key]?.score
      if (typeof score === "number") {
        acc[key] = score
      }
      return acc
    }, {})
  }, [reportData, latestScoredTask])

  const bandDelta = useMemo(() => {
    if (latestOverallBand == null || previousBand == null) {
      return null
    }
    return latestOverallBand - previousBand
  }, [latestOverallBand, previousBand])

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <TopNav />
        <SecondaryNav />
        <PageWithTOC>
          <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" id="welcome" data-toc-title="Welcome">Welcome back, {user?.displayName || "User"}</h1>
            <p className="text-muted-foreground">
              {userTarget ? (
                <>
                  Your target band: <span className="text-primary font-semibold">{userTarget.targetOverallBand.toFixed(1)}</span>. Keep going!
                </>
              ) : (
                <>Set your target band to get personalized recommendations!</>
              )}
            </p>
          </div>

          {/* Enhanced Overview Cards */}
          {reportData && !reportLoading && reportData.totalSubmissions > 0 && (
            <div className="mb-8" id="overview" data-toc-title="Overview">
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
          )}

          {/* Target Setting and Skill Priority Section */}
          {user && reportData && !reportLoading && reportData.totalSubmissions > 0 && (
            <div className="grid lg:grid-cols-3 gap-6 mb-8" id="target-setting" data-toc-title="Target Setting">
              <div className="lg:col-span-1">
                <TargetSetting
                  userId={user.uid}
                  onTargetSaved={handleTargetSaved}
                  currentTarget={userTarget}
                />
              </div>
              
              {userTarget && reportData.targetBasedRecommendations && (
                <div className="lg:col-span-2">
                  <SkillPriorityVisualization
                    skillPriority={reportData.targetBasedRecommendations.skillPriority}
                    currentAverage={reportData.currentOverallAverage}
                    targetBand={userTarget.targetOverallBand}
                  />
                </div>
              )}
            </div>
          )}

          {/* Key Recommendations - Eye-catching section */}
          {reportData && !reportLoading && reportData.targetBasedRecommendations && reportData.targetBasedRecommendations.repeatedSuggestions.length > 0 && (
            <Card className="rounded-2xl border border-border shadow-none mb-8" id="key-recommendations" data-toc-title="Key Recommendations">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Focus on these first</CardTitle>
                </div>
                <CardDescription className="text-base">
                  The issues that come up most often in your feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 border-t border-border">
                  {reportData.targetBasedRecommendations.repeatedSuggestions.slice(0, 4).map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="py-4 md:px-4 border-b border-border hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 pt-0.5">
                          <span className="font-mono text-sm text-primary tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {suggestion.relatedSkill}
                          </Badge>
                          <p className="text-sm font-medium leading-relaxed">{suggestion.suggestion}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Appeared {suggestion.count} times in your feedback
                          </p>
                          <p className="text-xs text-primary mt-2 font-medium">
                            Click to see how to improve →
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Work on these in your next two or three essays, then check whether the count drops.</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards - fallback when no report data */}
          {(!reportData || reportData.totalSubmissions === 0) && (
            <div className="grid md:grid-cols-3 gap-6 mb-8" id="stats" data-toc-title="Statistics">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Latest Overall Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading…</span>
                  </div>
                ) : latestOverallBand != null ? (
                  <>
                    <div className="text-3xl font-bold text-primary">{latestOverallBand.toFixed(1)}</div>
                    {bandDelta == null ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        First scored task recorded—keep practicing to track your progress!
                      </p>
                    ) : bandDelta === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">No change from last task</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className={bandDelta > 0 ? "text-success" : "text-destructive"}>
                          {bandDelta > 0 ? "+" : ""}
                          {bandDelta.toFixed(1)}
                        </span>{" "}
                        from last task
                      </p>
                    )}
                  </>
                ) : loadError ? (
                  <p className="text-sm text-destructive">{loadError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Score data will appear after your first AI review.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Practice Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculating…</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{streak}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {streak === 1 ? "day in a row" : "days in a row"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasks in Progress</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading…</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{tasksInProgress}</div>
                    <Link href="/tasks" className="text-xs text-primary hover:underline mt-1 inline-block">
                      View all tasks →
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {/* Personalized Study Plan */}
          {reportData && !reportLoading && reportData.targetBasedRecommendations && (
            <Card className="rounded-2xl border-border bg-card mb-8" id="study-plan" data-toc-title="Study Plan">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Your Personalized Study Plan</CardTitle>
                </div>
                <CardDescription>Recommended actions to reach your target faster</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Practice Frequency */}
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <PenLine className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Practice Goal</h3>
                        <p className="text-sm text-muted-foreground">Recommended frequency</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold mb-1">
                      {reportData.targetBasedRecommendations.studyPlan.weeklyTasksRecommended} essays/week
                    </p>
                    <p className="text-sm text-muted-foreground">
                      to reach your target in {reportData.targetBasedRecommendations.studyPlan.estimatedTimeToTarget}
                    </p>
                  </div>

                  {/* Focus Skills */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <Target className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Priority Skills</h3>
                        <p className="text-sm text-muted-foreground">Focus your practice on</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {reportData.targetBasedRecommendations.studyPlan.focusSkills.map((skill) => (
                        <Badge key={skill} variant="default" className="text-sm px-3 py-1">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Task Type Recommendations */}
                {reportData.targetBasedRecommendations.studyPlan.taskTypeRecommendations.length > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-accent" />
                      What to practice
                    </h3>
                    <ul className="space-y-2">
                      {reportData.targetBasedRecommendations.studyPlan.taskTypeRecommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Chart */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8" id="progress-activity" data-toc-title="Progress & Activity">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>Average performance across IELTS criteria from all your submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart scores={radarScores} isLoading={isLoading || reportLoading} />
                <Link href="/reports">
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Detailed Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest submissions and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {loadError ? (
                  <p className="text-sm text-destructive">{loadError}</p>
                ) : isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading your recent activity…</span>
                  </div>
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You haven't submitted any tasks yet. Create a new task to see your progress here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((task, index) => {
                      const status = (task.status || "draft").toLowerCase()
                      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1)
                      const band = task.overallBand ?? task.feedback?.overallBand
                      const scoreLabel =
                        typeof band === "number" ? `Scored ${band.toFixed(1)}` : status === "scored" ? "Scored" : statusLabel
                      const isLast = index === recentActivity.length - 1

                      return (
                        <div
                          key={task.id}
                          className={`flex items-start gap-3 ${isLast ? "" : "pb-4 border-b border-border"}`}
                        >
                          <div className="rounded-lg bg-primary/10 p-2">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title || task.prompt || "Untitled Task"}</p>
                            <p className="text-xs text-muted-foreground">
                              {(task.taskType || "Unknown Task Type") + " • " + scoreLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatTimestamp(task.updatedAt || task.createdAt)}</p>
                          </div>
                          <Badge variant={getStatusVariant(status)}>
                            {statusLabel}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="rounded-2xl border-border bg-card" id="quick-actions" data-toc-title="Quick Actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Start practicing or get help</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <Link href="/tasks/new" className="block">
                  <Button className="w-full h-auto py-6 flex-col gap-2">
                    <PenLine className="h-6 w-6" />
                    <span>New Task</span>
                  </Button>
                </Link>

                <Link href="/practice/prompts" className="block">
                  <Button variant="outline" className="w-full h-auto py-6 flex-col gap-2 bg-transparent">
                    <FileText className="h-6 w-6" />
                    <span>Pick a Prompt</span>
                  </Button>
                </Link>

                <Link href="/chat" className="block">
                  <Button variant="outline" className="w-full h-auto py-6 flex-col gap-2 bg-transparent">
                    <MessageSquare className="h-6 w-6" />
                    <span>Open Chatbot</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWithTOC>

      {/* Improvement Suggestions Dialog */}
      <Dialog open={selectedSuggestion !== null} onOpenChange={(open) => !open && setSelectedSuggestion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              How to Improve: {selectedSuggestion?.suggestion}
            </DialogTitle>
            <DialogDescription>
              {selectedSuggestion?.relatedSkill && CRITERIA_NAMES[selectedSuggestion.relatedSkill as keyof typeof CRITERIA_NAMES] && (
                <span>Related to: <strong>{CRITERIA_NAMES[selectedSuggestion.relatedSkill as keyof typeof CRITERIA_NAMES]}</strong></span>
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
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {improvementSuggestions}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      
      {/* Footer */}
      <Footer />
      </div>
    </ProtectedRoute>
  )
}

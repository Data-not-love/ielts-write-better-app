"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Copy, GitCompare, CheckCircle2, AlertCircle, Loader2, RefreshCw, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { getTask } from "@/lib/firebase-firestore"
import type { CriterionKey, TaskDocument, TaskFeedback, LineLevelFeedback } from "@/types/tasks"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { authFetch } from "@/lib/auth-fetch"
import { Task1VisualView } from "@/components/tasks/task1-visual-lazy"
import { RevisionHistory } from "@/components/tasks/revision-history"
import { applyCorrections, segmentByFeedback } from "@/lib/feedback-text"

interface TaskDetailProps {
  taskId: string
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<CriterionKey>("TR")
  const [feedbackTab, setFeedbackTab] = useState<"sentence" | "paragraph">("sentence")
  const [task, setTask] = useState<TaskDocument | null>(null)
  const [loadingTask, setLoadingTask] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedResponse, setEditedResponse] = useState("")
  const [isRevaluating, setIsRevaluating] = useState(false)
  const [highlightedFeedback, setHighlightedFeedback] = useState<LineLevelFeedback | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchTask = async () => {
      if (!user) {
        setTask(null)
        setLoadingTask(false)
        return
      }

      setLoadingTask(true)
      setLoadError(null)

      try {
        const data = await getTask(user.uid, taskId)
        if (!isMounted) return
        const typedTask = data as TaskDocument | null
        setTask(typedTask)
        setEditedResponse(typedTask?.response || "")

        const criteriaKeys = typedTask?.feedback?.criteria
          ? (Object.keys(typedTask.feedback.criteria) as CriterionKey[])
          : []
        if (criteriaKeys.length > 0) {
          setActiveTab(criteriaKeys[0])
        }
      } catch (error) {
        console.error("Failed to load task:", error)
        if (!isMounted) return
        setLoadError("Unable to load this task. Please try again later.")
      } finally {
        if (isMounted) {
          setLoadingTask(false)
        }
      }
    }

    if (!authLoading) {
      fetchTask()
    }

    return () => {
      isMounted = false
    }
  }, [authLoading, taskId, user])

  const handleRevaluate = async () => {
    if (!user || !task) return
    
    setIsRevaluating(true)
    try {
      const response = await authFetch("/api/essays/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server re-scores against the task's stored prompt and visual, then saves the revision
        body: JSON.stringify({
          essayText: editedResponse,
          save: { mode: "revision", taskId },
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.feedback) {
        throw new Error(data?.error || "Failed to re-evaluate essay")
      }

      // Refresh task data
      const updatedTask = await getTask(user.uid, taskId)
      setTask(updatedTask as TaskDocument)
      setIsEditing(false)

      toast({
        title: "Re-evaluation complete",
        description: "Your essay has been re-scored successfully.",
      })
    } catch (error) {
      console.error("Re-evaluation failed:", error)
      toast({
        title: "Re-evaluation failed",
        description: error instanceof Error ? error.message : "Unable to re-evaluate essay. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRevaluating(false)
    }
  }

  const handleCopy = () => {
    if (!task?.response) {
      return
    }
    navigator.clipboard
      .writeText(task.response)
      .then(() => {
        toast({
          title: "Copied",
          description: "Response copied to clipboard.",
        })
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "We couldn't copy the response to your clipboard.",
          variant: "destructive",
        })
      })
  }

  const criteriaLabels: Record<CriterionKey, string> = {
    TR: "Task Response",
    CC: "Coherence & Cohesion",
    LR: "Lexical Resource",
    GRA: "Grammar & Accuracy",
  }

  const HIGHLIGHT_COLORS: Record<string, [string, string]> = {
    grammar: ["bg-red-100 dark:bg-red-950/50", "bg-red-200 dark:bg-red-900"],
    lexical: ["bg-yellow-100 dark:bg-yellow-950/50", "bg-yellow-200 dark:bg-yellow-900"],
    coherence: ["bg-blue-100 dark:bg-blue-950/50", "bg-blue-200 dark:bg-blue-900"],
    task_response: ["bg-purple-100 dark:bg-purple-950/50", "bg-purple-200 dark:bg-purple-900"],
  }

  const renderHighlightedText = (text: string, feedbackItems: LineLevelFeedback[], highlighted: LineLevelFeedback | null) =>
    segmentByFeedback(text, feedbackItems).map((segment, index) => {
      if (!segment.feedback) return <span key={index}>{segment.text}</span>
      const isActive = highlighted === segment.feedback
      const [normal, active] = HIGHLIGHT_COLORS[segment.feedback.category] ?? ["bg-muted", "bg-muted-foreground/20"]
      return (
        <span
          key={index}
          className={`${isActive ? active : normal} px-1 rounded cursor-pointer transition-colors border-b-2 ${isActive ? "border-current" : "border-transparent"}`}
          title={segment.feedback.comment}
        >
          {segment.text}
        </span>
      )
    })

  type CriterionEntry = [CriterionKey, TaskFeedback["criteria"][CriterionKey]]

  const criteriaEntries = useMemo<CriterionEntry[]>(() => {
    if (!task?.feedback?.criteria) {
      return []
    }
    return (Object.entries(task.feedback.criteria) as CriterionEntry[]).filter(([key, value]) => {
      return Boolean(key && value)
    })
  }, [task])

  const overallBand = task?.overallBand ?? task?.feedback?.overallBand ?? null
  const actionItems = useMemo(() => {
    if (Array.isArray(task?.actionItems) && task.actionItems.length > 0) {
      return task.actionItems
    }
    if (Array.isArray(task?.feedback?.actionItems) && task.feedback.actionItems.length > 0) {
      return task.feedback.actionItems
    }
    return []
  }, [task])

  const tabsColumnClass = useMemo(() => {
    const count = Math.max(1, Math.min(criteriaEntries.length, 4))
    switch (count) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-2"
      case 3:
        return "grid-cols-3"
      default:
        return "grid-cols-4"
    }
  }, [criteriaEntries.length])

  useEffect(() => {
    if (criteriaEntries.length > 0) {
      const keys = criteriaEntries.map(([key]) => key)
      if (!keys.includes(activeTab)) {
        setActiveTab(keys[0])
      }
    }
  }, [activeTab, criteriaEntries])

  if (authLoading || loadingTask) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Sign in to view this task"
        description="You need to be signed in to view detailed IELTS feedback."
        action={{
          label: "Go to tasks",
          onClick: () => (window.location.href = "/tasks"),
        }}
      />
    )
  }

  if (loadError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load task"
        description={loadError}
        action={{
          label: "Back to tasks",
          onClick: () => (window.location.href = "/tasks"),
        }}
      />
    )
  }

  if (!task) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Task not found"
        description="We couldn't find the task you're looking for."
        action={{
          label: "View all tasks",
          onClick: () => (window.location.href = "/tasks"),
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{task.title || `${task.taskType ?? "Task"} Submission`}</h1>
          <p className="text-sm text-muted-foreground">{task.taskType || "IELTS Writing"}</p>
        </div>
        <Link href={`/tasks/${taskId}/compare`}>
          <Button variant="outline" className="bg-transparent">
            <GitCompare className="mr-2 h-4 w-4" />
            Compare Versions
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Response */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Response</CardTitle>
                <div className="flex gap-2">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit & Re-evaluate
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!task.response}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg mt-2">
                <strong>Prompt:</strong> {task.prompt || "No prompt provided"}
              </div>
              {task.visual != null && <Task1VisualView visual={task.visual} className="mt-3" />}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <Textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRevaluate}
                      disabled={isRevaluating || !editedResponse.trim()}
                    >
                      {isRevaluating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Re-evaluating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Re-evaluate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setEditedResponse(task.response || "")
                      }}
                      disabled={isRevaluating}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {task.feedback?.lineLevelFeedback && task.feedback.lineLevelFeedback.length > 0 ? (
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {renderHighlightedText(task.response || "", task.feedback.lineLevelFeedback, highlightedFeedback)}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {task.response}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line-Level Feedback Panel */}
          {task.feedback?.lineLevelFeedback && task.feedback.lineLevelFeedback.length > 0 && (
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader>
                <CardTitle>Error & Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={feedbackTab} onValueChange={(v) => setFeedbackTab(v as "sentence" | "paragraph")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sentence">Sentence-level Feedback</TabsTrigger>
                    <TabsTrigger value="paragraph">Suggested Improvements</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="sentence" className="space-y-2 mt-4">
                    {task.feedback.lineLevelFeedback.map((feedback, index) => {
                      const excerpt = task.response?.substring(feedback.startIndex, feedback.endIndex) || ""
                      const categoryColors = {
                        grammar: "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
                        lexical: "border-yellow-300 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/30",
                        coherence: "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
                        task_response: "border-purple-300 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/30",
                      }
                      
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-md border ${categoryColors[feedback.category]} cursor-pointer hover:border-foreground/30 transition-colors`}
                          onClick={() => setHighlightedFeedback(feedback)}
                          onMouseEnter={() => setHighlightedFeedback(feedback)}
                          onMouseLeave={() => setHighlightedFeedback(null)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {feedback.category.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-sm font-mono text-muted-foreground mb-2">
                                &quot;{excerpt}&quot;
                              </p>
                              <p className="text-sm mb-2">{feedback.comment}</p>
                              {feedback.suggestedRewrite && (
                                <div className="mt-2 p-2 bg-background rounded">
                                  <p className="text-xs text-muted-foreground mb-1">Suggested rewrite:</p>
                                  <p className="text-sm font-mono text-success">&quot;{feedback.suggestedRewrite}&quot;</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </TabsContent>
                  
                  <TabsContent value="paragraph" className="space-y-3 mt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Corrected Version (with all suggestions applied):</h4>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                            {applyCorrections(task.response || "", task.feedback.lineLevelFeedback)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-3 font-semibold">Key improvements to focus on:</p>
                        <ul className="space-y-2">
                          {task.feedback.actionItems?.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Revisions Timeline */}
          <RevisionHistory revisions={task.revisions ?? []} currentResponse={task.response || ""} prompt={task.prompt} />
        </div>

        {/* Right: Feedback */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Overall Band Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-6xl font-bold text-primary mb-2">
                  {typeof overallBand === "number" ? overallBand.toFixed(1) : "-"}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {task.summary || task.feedback?.summary || "Submit your task to receive a full IELTS assessment."}
                </p>
                {task.updatedAt && typeof task.updatedAt.toDate === 'function' && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {format(task.updatedAt.toDate(), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Criteria Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {criteriaEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Feedback will appear here once the AI has scored your essay.
                </p>
              ) : (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CriterionKey)}>
                  <TabsList className={`grid ${tabsColumnClass} w-full`}>
                    {criteriaEntries.map(([key]) => (
                      <TabsTrigger key={key} value={key} className="capitalize">
                        {key}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {criteriaEntries.map(([key, data]) => (
                    <TabsContent key={key} value={key} className="space-y-4 mt-4">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <h3 className="font-semibold">{criteriaLabels[key] || key}</h3>
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {typeof data.score === "number" ? data.score.toFixed(1) : "-"}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {data.strengths?.length ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <h4 className="text-sm font-medium">Strengths</h4>
                            </div>
                            <ul className="space-y-1 ml-6">
                              {data.strengths.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {data.issues?.length ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-warning" />
                              <h4 className="text-sm font-medium">Areas for Improvement</h4>
                            </div>
                            <ul className="space-y-1 ml-6">
                              {data.issues.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {data.suggestions?.length ? (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Suggestions</h4>
                            <ul className="space-y-1 ml-6">
                              {data.suggestions.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {data.examples?.length ? (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Examples from your essay</h4>
                            <ul className="space-y-1 ml-6">
                              {data.examples.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Action Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Focused practice recommendations from the AI will appear here after scoring.
                </p>
              ) : (
                <ul className="space-y-2">
                  {actionItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

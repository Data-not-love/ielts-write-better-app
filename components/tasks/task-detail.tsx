"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Copy, GitCompare, CheckCircle2, AlertCircle, Loader2, RefreshCw, Edit, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { getTask, addRevisionToTask } from "@/lib/firebase-firestore"
import type { CriterionKey, TaskDocument, TaskFeedback, LineLevelFeedback } from "@/types/tasks"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { authFetch } from "@/lib/auth-fetch"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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
  const [improvementRequests, setImprovementRequests] = useState<Record<string, any>>({})
  const [loadingImprovements, setLoadingImprovements] = useState<Record<string, boolean>>({})

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
        console.error("[v0] Failed to load task:", error)
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
        body: JSON.stringify({
          essayText: editedResponse,
          taskType: task.taskType,
          promptText: task.prompt,
          userId: user.uid,
          promptId: task.promptId,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data?.feedback) {
        throw new Error(data?.error || "Failed to re-evaluate essay")
      }

      // Add the new revision to the task
      await addRevisionToTask(user.uid, taskId, {
        id: data.revisionId,
        overallBand: data.feedback.overallBand,
        summary: data.feedback.summary,
        feedback: data.feedback,
      })

      // Refresh task data
      const updatedTask = await getTask(user.uid, taskId)
      setTask(updatedTask as TaskDocument)
      setIsEditing(false)

      toast({
        title: "Re-evaluation complete",
        description: "Your essay has been re-scored successfully.",
      })
    } catch (error: any) {
      console.error("[v0] Re-evaluation failed:", error)
      toast({
        title: "Re-evaluation failed",
        description: error.message || "Unable to re-evaluate essay. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRevaluating(false)
    }
  }

  const handleRequestImprovement = async (feedbackItem: LineLevelFeedback, revisionId: string, response: string) => {
    const key = `${revisionId}-${feedbackItem.startIndex}-${feedbackItem.endIndex}`
    
    setLoadingImprovements(prev => ({ ...prev, [key]: true }))
    
    try {
      const sentence = response.substring(feedbackItem.startIndex, feedbackItem.endIndex)
      
      const res = await authFetch("/api/essays/improve-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence,
          context: task?.prompt,
          category: feedbackItem.category,
          currentIssue: feedbackItem.comment,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Failed to get improvement suggestions")
      }

      setImprovementRequests(prev => ({ 
        ...prev, 
        [key]: data.improvement 
      }))

      toast({
        title: "Đề xuất cải thiện đã sẵn sàng",
        description: "Đã tạo đề xuất sửa lỗi cho câu này.",
      })
    } catch (error: any) {
      console.error("[v0] Failed to get improvement:", error)
      toast({
        title: "Không thể tạo đề xuất",
        description: error.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setLoadingImprovements(prev => ({ ...prev, [key]: false }))
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

  const renderHighlightedText = (text: string, feedbackItems: LineLevelFeedback[], highlighted: LineLevelFeedback | null) => {
    if (!feedbackItems || feedbackItems.length === 0) {
      return text
    }

    // Sort feedback items by startIndex to process them in order
    const sortedFeedback = [...feedbackItems]
      .filter(item => {
        // Validate indices
        return item.startIndex >= 0 && 
               item.endIndex <= text.length && 
               item.startIndex < item.endIndex
      })
      .sort((a, b) => a.startIndex - b.startIndex)
    
    const parts: JSX.Element[] = []
    let lastIndex = 0

    sortedFeedback.forEach((feedback, index) => {
      // Add text before this feedback
      if (feedback.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, feedback.startIndex)}
          </span>
        )
      }

      // Add the highlighted feedback
      const categoryColors: Record<string, string> = {
        grammar: highlighted === feedback ? "bg-red-200 dark:bg-red-900" : "bg-red-100 dark:bg-red-950/50",
        lexical: highlighted === feedback ? "bg-yellow-200 dark:bg-yellow-900" : "bg-yellow-100 dark:bg-yellow-950/50",
        coherence: highlighted === feedback ? "bg-blue-200 dark:bg-blue-900" : "bg-blue-100 dark:bg-blue-950/50",
        task_response: highlighted === feedback ? "bg-purple-200 dark:bg-purple-900" : "bg-purple-100 dark:bg-purple-950/50",
      }

      const colorClass = categoryColors[feedback.category] || (highlighted === feedback ? "bg-gray-200 dark:bg-gray-900" : "bg-gray-100 dark:bg-gray-950/50")

      parts.push(
        <span
          key={`feedback-${index}`}
          className={`${colorClass} px-1 rounded cursor-pointer transition-colors border-b-2 ${
            highlighted === feedback ? "border-current" : "border-transparent"
          }`}
          title={feedback.comment}
        >
          {text.substring(feedback.startIndex, feedback.endIndex)}
        </span>
      )

      lastIndex = feedback.endIndex
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      )
    }

    return <>{parts}</>
  }

  const renderCorrectedText = (text: string, feedbackItems: LineLevelFeedback[]) => {
    if (!feedbackItems || feedbackItems.length === 0) {
      return text
    }

    // Helper function to check if feedback is irrelevant
    const isIrrelevant = (feedback: LineLevelFeedback) => {
      if (!feedback.comment) return false
      
      const commentLower = feedback.comment.toLowerCase()
      const irrelevanceKeywords = [
        'n/a',
        'irrelevant to the prompt',
        'irrelevant to prompt',
        'should be removed',
        'does not address the prompt'
      ]
      
      return irrelevanceKeywords.some(keyword => commentLower.includes(keyword))
    }

    // Sort feedback items by startIndex in reverse order to process from end to start
    // This prevents index shifting issues
    const sortedFeedback = [...feedbackItems]
      .filter(item => {
        return item.startIndex >= 0 && 
               item.endIndex <= text.length && 
               item.startIndex < item.endIndex
      })
      .sort((a, b) => b.startIndex - a.startIndex)
    
    let correctedText = text
    
    sortedFeedback.forEach((feedback) => {
      const before = correctedText.substring(0, feedback.startIndex)
      const after = correctedText.substring(feedback.endIndex)
      
      if (isIrrelevant(feedback)) {
        // Remove this segment entirely (skip it in the improved version)
        correctedText = before + after
      } else if (feedback.suggestedRewrite) {
        // Replace with suggested rewrite
        correctedText = before + feedback.suggestedRewrite + after
      }
      // else: keep the original text (do nothing)
    })

    return correctedText
  }

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
                                "{excerpt}"
                              </p>
                              <p className="text-sm mb-2">{feedback.comment}</p>
                              {feedback.suggestedRewrite && (
                                <div className="mt-2 p-2 bg-background rounded">
                                  <p className="text-xs text-muted-foreground mb-1">Suggested rewrite:</p>
                                  <p className="text-sm font-mono text-success">"{feedback.suggestedRewrite}"</p>
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
                            {renderCorrectedText(task.response || "", task.feedback.lineLevelFeedback)}
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
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Revisions Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {!task.revisions || task.revisions.length === 0 ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  No revisions have been recorded for this task yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {task.revisions.map((revision, index) => {
                    const revisionNumber = task.revisions!.length - index
                    const hasErrors = revision.feedback?.lineLevelFeedback && revision.feedback.lineLevelFeedback.length > 0
                    
                    return (
                      <Collapsible key={revision.id}>
                        <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Revision {revisionNumber}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {revision.createdAt && typeof revision.createdAt.toDate === 'function'
                                  ? format(revision.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")
                                  : "Recent"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-sm">
                                Band {revision.overallBand.toFixed(1)}
                              </Badge>
                              {hasErrors && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <AlertCircle className="h-4 w-4 mr-1 text-warning" />
                                    {revision.feedback.lineLevelFeedback!.length} lỗi
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{revision.summary}</p>
                          
                          {hasErrors && (
                            <CollapsibleContent className="mt-3">
                              <div className="space-y-2 pl-2 border-l-2 border-muted">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Các lỗi được phát hiện:</p>
                                {revision.feedback!.lineLevelFeedback!.map((feedback, fbIndex) => {
                                  const key = `${revision.id}-${feedback.startIndex}-${feedback.endIndex}`
                                  const improvement = improvementRequests[key]
                                  const isLoading = loadingImprovements[key]
                                  const excerpt = task.response?.substring(feedback.startIndex, feedback.endIndex) || ""
                                  
                                  const categoryColors = {
                                    grammar: "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
                                    lexical: "border-yellow-300 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/30",
                                    coherence: "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
                                    task_response: "border-purple-300 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/30",
                                  }
                                  
                                  const categoryLabels = {
                                    grammar: "Ngữ pháp",
                                    lexical: "Từ vựng",
                                    coherence: "Liên kết",
                                    task_response: "Phù hợp đề bài",
                                  }
                                  
                                  return (
                                    <div
                                      key={fbIndex}
                                      className={`p-3 rounded-md border ${categoryColors[feedback.category]} space-y-2`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                              {categoryLabels[feedback.category]}
                                            </Badge>
                                          </div>
                                          <p className="text-sm font-mono text-muted-foreground mb-2">
                                            "{excerpt}"
                                          </p>
                                          <p className="text-sm mb-2">{feedback.comment}</p>
                                          
                                          {!improvement && !feedback.suggestedRewrite && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleRequestImprovement(feedback, revision.id, task.response || "")}
                                              disabled={isLoading}
                                              className="mt-2"
                                            >
                                              {isLoading ? (
                                                <>
                                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                  Đang tạo đề xuất...
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="h-3 w-3 mr-1" />
                                                  Request Improve
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          
                                          {(feedback.suggestedRewrite || improvement) && (
                                            <div className="mt-2 p-3 bg-background rounded space-y-2">
                                              <p className="text-xs font-semibold text-success mb-1">
                                                <Sparkles className="h-3 w-3 inline mr-1" />
                                                Đề xuất cải thiện:
                                              </p>
                                              <p className="text-sm font-mono text-success">
                                                "{improvement?.improvedSentence || feedback.suggestedRewrite}"
                                              </p>
                                              
                                              {improvement && (
                                                <>
                                                  <div className="pt-2 border-t border-border">
                                                    <p className="text-xs font-semibold mb-1">Giải thích:</p>
                                                    <p className="text-xs text-muted-foreground">{improvement.explanation}</p>
                                                  </div>
                                                  
                                                  {improvement.grammarIssues?.length > 0 && (
                                                    <div className="pt-2">
                                                      <p className="text-xs font-semibold mb-1">Lỗi ngữ pháp:</p>
                                                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                                        {improvement.grammarIssues.map((issue: string, i: number) => (
                                                          <li key={i}>{issue}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {improvement.spellingIssues?.length > 0 && (
                                                    <div className="pt-2">
                                                      <p className="text-xs font-semibold mb-1">Lỗi chính tả:</p>
                                                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                                        {improvement.spellingIssues.map((issue: string, i: number) => (
                                                          <li key={i}>{issue}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {improvement.styleImprovements?.length > 0 && (
                                                    <div className="pt-2">
                                                      <p className="text-xs font-semibold mb-1">Cải thiện phong cách:</p>
                                                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                                        {improvement.styleImprovements.map((issue: string, i: number) => (
                                                          <li key={i}>{issue}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </CollapsibleContent>
                          )}
                        </div>
                      </Collapsible>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

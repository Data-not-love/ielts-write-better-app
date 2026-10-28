"use client"

import { useState } from "react"
import { format } from "date-fns"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"
import type { FeedbackCategory, LineLevelFeedback, Revision, SentenceImprovement } from "@/types/tasks"

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  grammar: "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
  lexical: "border-yellow-300 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/30",
  coherence: "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
  task_response: "border-purple-300 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/30",
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  grammar: "Ngữ pháp",
  lexical: "Từ vựng",
  coherence: "Liên kết",
  task_response: "Phù hợp đề bài",
}

type Props = {
  revisions: Revision[]
  /** The task's current essay; used for older revisions saved before they stored their own text */
  currentResponse: string
  prompt?: string
}

/** Every scored version of a task, newest first, with on-demand rewrites for each flagged sentence. */
export function RevisionHistory({ revisions, currentResponse, prompt }: Props) {
  const { toast } = useToast()
  const [improvements, setImprovements] = useState<Record<string, SentenceImprovement>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Revisions are stored oldest first; show the newest on top with its real number
  const ordered = revisions.map((revision, i) => ({ revision, number: i + 1 })).reverse()

  const requestImprovement = async (key: string, item: LineLevelFeedback, essay: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await authFetch("/api/essays/improve-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: essay.substring(item.startIndex, item.endIndex),
          context: prompt,
          category: item.category,
          currentIssue: item.comment,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.improvement) throw new Error(data?.error || "Failed to get improvement suggestions")

      setImprovements((prev) => ({ ...prev, [key]: data.improvement }))
      toast({ title: "Đề xuất cải thiện đã sẵn sàng", description: "Đã tạo đề xuất sửa lỗi cho câu này." })
    } catch (error) {
      console.error("Failed to get improvement:", error)
      toast({
        title: "Không thể tạo đề xuất",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <CardTitle>Revisions Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">No revisions have been recorded for this task yet.</div>
        ) : (
          <div className="space-y-4">
            {ordered.map(({ revision, number }) => {
              const lineFeedback = revision.feedback?.lineLevelFeedback ?? []
              // Indices refer to the essay as scored in this revision, which may differ from the current one
              const essay = revision.response ?? currentResponse

              return (
                <Collapsible key={revision.id}>
                  <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Revision {number}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {revision.createdAt && typeof revision.createdAt.toDate === "function"
                            ? format(revision.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")
                            : "Recent"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-sm">
                          Band {revision.overallBand.toFixed(1)}
                        </Badge>
                        {lineFeedback.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <AlertCircle className="h-4 w-4 mr-1 text-warning" />
                              {lineFeedback.length} lỗi
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{revision.summary}</p>

                    {lineFeedback.length > 0 && (
                      <CollapsibleContent className="mt-3">
                        <div className="space-y-2 pl-2 border-l-2 border-muted">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Các lỗi được phát hiện:</p>
                          {lineFeedback.map((feedback, fbIndex) => {
                            const key = `${revision.id}-${feedback.startIndex}-${feedback.endIndex}`
                            const improvement = improvements[key]
                            const isLoading = loading[key]
                            const excerpt = essay.substring(feedback.startIndex, feedback.endIndex)

                            return (
                              <div key={fbIndex} className={`p-3 rounded-md border ${CATEGORY_COLORS[feedback.category]} space-y-2`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {CATEGORY_LABELS[feedback.category]}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-mono text-muted-foreground mb-2">&quot;{excerpt}&quot;</p>
                                    <p className="text-sm mb-2">{feedback.comment}</p>

                                    {!improvement && !feedback.suggestedRewrite && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => requestImprovement(key, feedback, essay)}
                                        disabled={isLoading}
                                        className="mt-2"
                                      >
                                        {isLoading ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Đang tạo đề xuất…
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
                                          &quot;{improvement?.improvedSentence || feedback.suggestedRewrite}&quot;
                                        </p>
                                        {improvement && <ImprovementDetails improvement={improvement} />}
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
  )
}

function ImprovementDetails({ improvement }: { improvement: SentenceImprovement }) {
  const lists: [string, string[]][] = [
    ["Lỗi ngữ pháp:", improvement.grammarIssues],
    ["Lỗi chính tả:", improvement.spellingIssues],
    ["Cải thiện phong cách:", improvement.styleImprovements],
  ]
  return (
    <>
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold mb-1">Giải thích:</p>
        <p className="text-xs text-muted-foreground">{improvement.explanation}</p>
      </div>
      {lists.map(([label, items]) =>
        items?.length > 0 ? (
          <div key={label} className="pt-2">
            <p className="text-xs font-semibold mb-1">{label}</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </>
  )
}

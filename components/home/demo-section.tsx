"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertCircle } from "lucide-react"

const sampleEssay = `Some people believe that technology has made our lives more complex, while others think it has simplified them. In my opinion, while technology has introduced certain complexities, it has overall made our lives significantly easier.

On one hand, technology can be overwhelming. The constant need to update software, learn new applications, and manage multiple devices can be stressful. Additionally, the abundance of information available online can make decision-making more difficult.

However, technology has simplified many aspects of daily life. Communication has become instant and effortless through smartphones and social media. Tasks that once took hours, such as banking or shopping, can now be completed in minutes online. Furthermore, technology has improved access to education and healthcare, making these essential services more convenient.

In conclusion, despite some added complexity, technology has predominantly simplified our lives by making tasks more efficient and accessible.`

export function DemoSection() {
  const [text, setText] = useState(sampleEssay)
  const [isScoring, setIsScoring] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRunDemo = async () => {
    setIsScoring(true)
    setError(null)
    setFeedback(null)
    try {
      const response = await fetch("/api/ai/score-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: text,
          taskType: "Task 2",
          prompt:
            "Some people believe that technology has made our lives more complex, while others think it has simplified them. Discuss both views and give your opinion.",
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to score essay. Please try again.")
        return
      }
      
      if (data.feedback) {
        setFeedback(data.feedback)
      } else {
        setError("No feedback received. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error scoring essay:", error)
      setError("Failed to score essay. Please check your connection and try again.")
    } finally {
      setIsScoring(false)
    }
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-foreground/80 pt-4">
          <h2 className="text-2xl md:text-3xl">Chấm thử một bài Task 2</h2>
          <p className="text-sm text-muted-foreground">Bài mẫu có sẵn, bạn có thể sửa trước khi chấm</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
          <Card className="rounded-md border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle>Bài viết</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[340px] text-[0.95rem] leading-7"
                placeholder="Dán bài viết của bạn vào đây…"
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="font-mono text-sm text-muted-foreground tabular-nums">{text.split(" ").length} từ</p>
                <Button onClick={handleRunDemo} disabled={isScoring || !text}>
                  {isScoring ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang chấm…
                    </>
                  ) : (
                    "Chấm bài"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle>Nhận xét</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!feedback && !error ? (
                <div className="flex min-h-[300px] flex-col justify-center gap-2 text-muted-foreground">
                  <p className="font-display text-5xl text-muted-foreground/30">–.–</p>
                  <p className="text-sm">Bấm “Chấm bài” để xem band điểm và nhận xét theo từng tiêu chí.</p>
                </div>
              ) : null}

              {feedback ? (
                <div className="space-y-6 animate-rise-in">
                  <div className="flex items-end justify-between border-b border-border pb-6">
                    <p className="text-sm text-muted-foreground">Band ước tính</p>
                    <div className="font-display text-6xl font-semibold leading-none text-primary tabular-nums">
                      {feedback.overallBand.toFixed(1)}
                    </div>
                  </div>

                  <div className="divide-y divide-border [&>div]:py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Task Response (TR)</span>
                      <span className="font-mono text-sm font-medium tabular-nums">{feedback.criteria.TR.score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Coherence & Cohesion (CC)</span>
                      <span className="font-mono text-sm font-medium tabular-nums">{feedback.criteria.CC.score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lexical Resource (LR)</span>
                      <span className="font-mono text-sm font-medium tabular-nums">{feedback.criteria.LR.score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Grammar & Accuracy (GRA)</span>
                      <span className="font-mono text-sm font-medium tabular-nums">{feedback.criteria.GRA.score.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">{feedback.summary}</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

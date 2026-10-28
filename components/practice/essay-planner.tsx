"use client"

import { titledError, type EssayOutline, type TitledError } from "@/types/practice"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, Send } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

export function EssayPlanner() {
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [targetBand, setTargetBand] = useState("7.0")
  const [isGenerating, setIsGenerating] = useState(false)
  const [outline, setOutline] = useState<EssayOutline | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await authFetch("/api/ai/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, targetBand }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Check for rate limit errors
        const isRateLimitError = response.status === 429 || result?.errorType === "RATE_LIMIT"
        const errorMessage = isRateLimitError
          ? result?.error || "AI tạo dàn ý đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút."
          : result?.error || "Failed to generate outline. Please try again."
        
        throw titledError(errorMessage, isRateLimitError ? "Vượt giới hạn sử dụng" : "Error")
      }
      
      if (result.outline) {
        setOutline(result.outline)
      }
    } catch (caught) {
      const error = caught as TitledError
      console.error("Error generating outline:", error)
      toast({
        title: error?.title || "Error",
        description: error?.message || "Failed to generate outline. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendToTask = () => {
    window.location.href = "/tasks/new"
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Essay Planner</h1>
        <p className="text-muted-foreground">Generate a structured outline for your essay</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Essay Details</CardTitle>
            <CardDescription>Enter your topic and target band score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Topic / Prompt</Label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="E.g., Some people believe that technology has made our lives more complex..."
                className="min-h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Band Score</Label>
              <Select value={targetBand} onValueChange={setTargetBand}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6.0">6.0</SelectItem>
                  <SelectItem value="6.5">6.5</SelectItem>
                  <SelectItem value="7.0">7.0</SelectItem>
                  <SelectItem value="7.5">7.5</SelectItem>
                  <SelectItem value="8.0">8.0</SelectItem>
                  <SelectItem value="8.5">8.5</SelectItem>
                  <SelectItem value="9.0">9.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating || !topic} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Outline...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Outline
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Generated Outline</CardTitle>
            <CardDescription>Structured plan for your essay</CardDescription>
          </CardHeader>
          <CardContent>
            {!outline ? (
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-center">
                <p>Enter a topic and click &quot;Generate Outline&quot; to see your essay structure</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Introduction</h3>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>
                      <span className="text-muted-foreground">Hook:</span> {outline.introduction.hook}
                    </li>
                    <li>
                      <span className="text-muted-foreground">Background:</span> {outline.introduction.background}
                    </li>
                    <li>
                      <span className="text-muted-foreground">Thesis:</span> {outline.introduction.thesis}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Body Paragraph 1</h3>
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Topic:</span> {outline.body1.topic}
                  </p>
                  <ul className="space-y-1 text-sm ml-4">
                    {outline.body1.points.map((point: string, i: number) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Body Paragraph 2</h3>
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Topic:</span> {outline.body2.topic}
                  </p>
                  <ul className="space-y-1 text-sm ml-4">
                    {outline.body2.points.map((point: string, i: number) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Counter-argument</h3>
                  <p className="text-sm mb-1">
                    <span className="text-muted-foreground">Point:</span> {outline.counterArgument.point}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Rebuttal:</span> {outline.counterArgument.rebuttal}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Conclusion</h3>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>
                      <span className="text-muted-foreground">Summary:</span> {outline.conclusion.summary}
                    </li>
                    <li>
                      <span className="text-muted-foreground">Final thought:</span> {outline.conclusion.finalThought}
                    </li>
                  </ul>
                </div>

                <Button onClick={handleSendToTask} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send to New Task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

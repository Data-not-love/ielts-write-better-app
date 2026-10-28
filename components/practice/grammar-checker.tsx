"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"

export function GrammarChecker() {
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [issues, setIssues] = useState<any[]>([])

  const handleCheck = async () => {
    setIsChecking(true)
    try {
      const response = await authFetch("/api/ai/grammar-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Check for rate limit errors
        if (response.status === 429 || result?.errorType === "RATE_LIMIT") {
          const error: any = new Error(result?.error || "AI kiểm tra ngữ pháp đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.")
          error.title = "Vượt giới hạn sử dụng"
          throw error
        } else {
          throw new Error(result?.error || "Failed to check grammar. Please try again.")
        }
      }
      
      if (result.issues) {
        setIssues(result.issues)
      }
    } catch (error: any) {
      console.error("[v0] Error checking grammar:", error)
      toast({
        title: error?.title || "Error",
        description: error?.message || "Failed to check grammar. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  const handleApplyAll = () => {
    let correctedText = input
    issues.forEach((issue) => {
      correctedText = correctedText.replace(issue.original, issue.suggested)
    })
    setInput(correctedText)
    setIssues([])
    toast({
      title: "All fixes applied",
      description: "Your text has been corrected.",
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Grammar Checker</h1>
        <p className="text-muted-foreground">Check your text for grammar, spelling, and style issues</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Your Text</CardTitle>
            <CardDescription>Paste your text to check for errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your text here..."
              className="min-h-[400px] font-mono text-sm"
            />

            <Button onClick={handleCheck} disabled={isChecking || !input} className="w-full">
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Grammar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Check Grammar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Issues Found</CardTitle>
                <CardDescription>
                  {issues.length > 0 ? `${issues.length} issues detected` : "No issues to display"}
                </CardDescription>
              </div>
              {issues.length > 0 && (
                <Button onClick={handleApplyAll} size="sm">
                  Apply All Fixes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-center">
                <p>Enter text and click "Check Grammar" to see issues</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {issues.map((issue, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border bg-background/50">
                    <div className="flex items-start gap-3 mb-2">
                      <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Line {issue.line}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{issue.rule}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="text-destructive line-through">{issue.original}</span>
                            <span className="mx-2">→</span>
                            <span className="text-success font-medium">{issue.suggested}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{issue.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

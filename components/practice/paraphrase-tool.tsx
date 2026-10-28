"use client"

import { titledError, type Paraphrase, type TitledError } from "@/types/practice"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"

export function ParaphraseTool() {
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [paraphrases, setParaphrases] = useState<Paraphrase[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await authFetch("/api/ai/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Check for rate limit errors
        if (response.status === 429 || result?.errorType === "RATE_LIMIT") {
          throw titledError(result?.error || "AI diễn giải đang vượt giới hạn sử dụng. Vui lòng thử lại sau vài phút.", "Vượt giới hạn sử dụng")
        } else {
          throw new Error(result?.error || "Failed to generate paraphrases. Please try again.")
        }
      }
      
      if (result.paraphrases) {
        setParaphrases(result.paraphrases)
      }
    } catch (caught) {
      const error = caught as TitledError
      console.error("Error generating paraphrases:", error)
      toast({
        title: error?.title || "Error",
        description: error?.message || "Failed to generate paraphrases. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast({
      title: "Copied",
      description: "Paraphrase copied to clipboard.",
    })
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleReplace = (text: string) => {
    setInput(text)
    toast({
      title: "Replaced",
      description: "Input text has been replaced with the paraphrase.",
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Paraphrase Tool</h1>
        <p className="text-muted-foreground">Rephrase sentences with different styles and vocabulary levels</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Original Text</CardTitle>
            <CardDescription>Enter a sentence or paragraph to paraphrase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., Technology has changed modern life significantly."
              className="min-h-[200px]"
            />

            <Button onClick={handleGenerate} disabled={isGenerating || !input} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Paraphrases...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Paraphrases
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Paraphrase Options</CardTitle>
            <CardDescription>Choose the style that fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            {paraphrases.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-center">
                <p>Enter text and click &quot;Generate Paraphrases&quot; to see options</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paraphrases.map((paraphrase, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border bg-background/50">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{paraphrase.style}</Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(paraphrase.text, index)}
                        >
                          {copiedIndex === index ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-2">{paraphrase.text}</p>
                    <p className="text-xs text-muted-foreground mb-3">{paraphrase.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReplace(paraphrase.text)}
                      className="bg-transparent"
                    >
                      Replace Input
                    </Button>
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

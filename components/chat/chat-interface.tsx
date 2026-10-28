"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Send, Bot, User, ChevronDown, FileText, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useChatSession } from "@/hooks/use-chat-session"
import { Markdown } from "@/components/ui/markdown"

export function ChatInterface() {
  const { user } = useAuth()
  const [isEssaysOpen, setIsEssaysOpen] = useState(false)
  const {
    messages,
    input,
    setInput,
    tone,
    setTone,
    level,
    setLevel,
    modelOptions,
    selectedModel,
    setSelectedModel,
    modelError,
    isLoading,
    scoredEssays,
    selectedEssay,
    setSelectedEssay,
    loadingEssays,
    handleSend,
    handleQuickAction,
    handleKeyDown,
  } = useChatSession()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" id="assistant" data-toc-title="AI Writing Assistant">AI Writing Assistant</h1>
        <p className="text-muted-foreground">Get instant help with your IELTS writing</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="rounded-2xl border-border bg-card" id="conversation" data-toc-title="Conversation">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <div className="space-y-4 mb-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <div className="rounded-full bg-primary/10 p-6 mb-4">
                      <Bot className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Hi! I&apos;m your IELTS Writing Assistant</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      I can analyze your draft by TR/CC/LR/GRA or help paraphrase sentences. Ask me anything about IELTS
                      writing!
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 animate-rise-in ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="rounded-full bg-primary/10 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <Markdown content={message.content} className="text-sm leading-relaxed" />
                        )}
                      </div>
                      {message.role === "user" && (
                        <div className="rounded-full bg-accent/10 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-8 w-8 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-muted">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="space-y-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="E.g., 'Rewrite my introduction to better address TR' or 'How can I improve my vocabulary?'"
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Context Panel */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border bg-card" id="context" data-toc-title="Context">
            <CardHeader>
              <CardTitle className="text-base">Bài viết đã chấm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <p className="text-sm text-muted-foreground">Đăng nhập để xem bài viết của bạn</p>
              ) : loadingEssays ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : scoredEssays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có bài viết đã chấm điểm</p>
              ) : (
                <div className="space-y-3">
                  <Collapsible open={isEssaysOpen} onOpenChange={setIsEssaysOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="text-sm">
                          {selectedEssay ? selectedEssay.title : "Chọn bài viết"}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isEssaysOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                      {scoredEssays.map((essay) => (
                        <div
                          key={essay.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedEssay?.id === essay.id
                              ? "bg-primary/10 border-primary"
                              : "bg-card hover:bg-muted border-border"
                          }`}
                          onClick={() => {
                            setSelectedEssay(essay)
                            setIsEssaysOpen(false)
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{essay.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {essay.taskType}
                                </Badge>
                                <span className="text-xs font-semibold text-primary">
                                  Band {essay.overallBand?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            {selectedEssay?.id === essay.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {selectedEssay && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium">Yêu cầu nhanh</Label>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => handleQuickAction("Chỉ ra các lỗi sai trong bài writing này")}
                          disabled={isLoading}
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Chỉ ra lỗi sai
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => handleQuickAction("Cải thiện bài writing này để đạt điểm cao hơn")}
                          disabled={isLoading}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Cải thiện bài viết
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() =>
                            handleQuickAction("Viết một bài mẫu khác tốt hơn dựa trên đề bài này")
                          }
                          disabled={isLoading}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Viết bài mẫu tốt hơn
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card" id="settings" data-toc-title="Settings">
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Gemini model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelOptions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={modelError ?? "Select a model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {modelError && <p className="text-xs text-destructive">{modelError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B1">B1 (Intermediate)</SelectItem>
                    <SelectItem value="B2">B2 (Upper-Intermediate)</SelectItem>
                    <SelectItem value="C1">C1 (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

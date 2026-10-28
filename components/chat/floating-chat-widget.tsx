"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Send, Bot, User, ChevronDown, FileText, CheckCircle2, AlertCircle, Sparkles, MessageCircle, X } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useChatSession } from "@/hooks/use-chat-session"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/ui/markdown"

export function FloatingChatWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
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
  } = useChatSession({ active: isOpen })

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon-lg"
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full shadow-md transition-colors",
          isOpen && "hidden"
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[450px] shadow-2xl rounded-lg border bg-background">
          <Card className="rounded-lg border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">AI Writing Assistant</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-3">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Hi! I&apos;m here to help</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Ask me anything about IELTS writing or get help with your essays!
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 animate-rise-in ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="rounded-full bg-primary/10 p-1.5 h-6 w-6 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 max-w-[75%] text-xs ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <Markdown content={message.content} className="leading-relaxed" />
                        )}
                      </div>
                      {message.role === "user" && (
                        <div className="rounded-full bg-accent/10 p-1.5 h-6 w-6 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-accent" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="rounded-full bg-primary/10 p-1.5 h-6 w-6 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Essay Selection */}
              {!user ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Đăng nhập để sử dụng bài viết của bạn
                </p>
              ) : loadingEssays ? (
                <p className="text-xs text-muted-foreground text-center py-2">Đang tải...</p>
              ) : scoredEssays.length > 0 ? (
                <div className="space-y-2">
                  <Collapsible open={isEssaysOpen} onOpenChange={setIsEssaysOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                        <span className="truncate">
                          {selectedEssay ? selectedEssay.title : "Chọn bài viết"}
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isEssaysOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1.5 max-h-[150px] overflow-y-auto">
                      {scoredEssays.map((essay) => (
                        <div
                          key={essay.id}
                          className={`p-2 rounded-md border cursor-pointer transition-colors text-xs ${
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
                              <p className="font-medium truncate">{essay.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {essay.taskType}
                                </Badge>
                                <span className="text-[10px] font-semibold text-primary">
                                  Band {essay.overallBand?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            {selectedEssay?.id === essay.id && (
                              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {selectedEssay && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1.5 py-1 h-auto"
                        onClick={() => handleQuickAction("Chỉ ra các lỗi sai trong bài writing này")}
                        disabled={isLoading}
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Lỗi sai
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1.5 py-1 h-auto"
                        onClick={() => handleQuickAction("Cải thiện bài writing này để đạt điểm cao hơn")}
                        disabled={isLoading}
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Cải thiện
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1.5 py-1 h-auto"
                        onClick={() =>
                          handleQuickAction("Viết một bài mẫu khác tốt hơn dựa trên đề bài này")
                        }
                        disabled={isLoading}
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        Bài mẫu
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Input */}
              <div className="space-y-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="min-h-[60px] text-xs resize-none"
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-full" size="sm">
                  <Send className="mr-2 h-3 w-3" />
                  Gửi
                </Button>
              </div>

              {/* Settings - Collapsed by default */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    <ChevronDown className="mr-2 h-3 w-3" />
                    Cài đặt nâng cao
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelOptions.length === 0}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={modelError ?? "Select a model"} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="text-xs">
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral" className="text-xs">Neutral</SelectItem>
                        <SelectItem value="academic" className="text-xs">Academic</SelectItem>
                        <SelectItem value="concise" className="text-xs">Concise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B1" className="text-xs">B1 (Intermediate)</SelectItem>
                        <SelectItem value="B2" className="text-xs">B2 (Upper-Intermediate)</SelectItem>
                        <SelectItem value="C1" className="text-xs">C1 (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

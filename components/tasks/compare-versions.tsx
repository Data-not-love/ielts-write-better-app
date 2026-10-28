"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, WrapText, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { getTask } from "@/lib/firebase-firestore"
import type { TaskDocument } from "@/types/tasks"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"
import { Task1VisualView } from "@/components/tasks/task1-visual"

interface CompareVersionsProps {
  taskId: string
}

interface Version {
  id: string
  label: string
  text: string
}

export function CompareVersions({ taskId }: CompareVersionsProps) {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [versionA, setVersionA] = useState("v1")
  const [versionB, setVersionB] = useState("v2")
  const [wrapText, setWrapText] = useState(true)
  const [task, setTask] = useState<TaskDocument | null>(null)
  const [loadingTask, setLoadingTask] = useState(true)
  const [aiSampleEssay, setAiSampleEssay] = useState<string>("")
  const [generatingAI, setGeneratingAI] = useState(false)
  const [versions, setVersions] = useState<Version[]>([
    { id: "v1", label: "Original Submission", text: "" },
    { id: "v2", label: "AI Suggested Revision", text: "" },
  ])

  // Fetch task and generate AI sample essay
  useEffect(() => {
    let isMounted = true

    const fetchTaskAndGenerateAI = async () => {
      if (!user) {
        setLoadingTask(false)
        return
      }

      setLoadingTask(true)

      try {
        // Fetch task data
        const taskData = await getTask(user.uid, taskId)
        if (!isMounted) return
        
        setTask(taskData as TaskDocument | null)

        if (taskData) {
          // Set original submission
          const originalText = taskData.response || "No submission found"
          
          // Update versions with original submission
          setVersions((prev) => {
            const updated = [...prev]
            updated[0].text = originalText
            return updated
          })

          // Generate AI sample essay if prompt exists
          if (taskData.prompt) {
            setGeneratingAI(true)
            try {
              const response = await authFetch("/api/essays/generate-sample", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  promptText: taskData.prompt,
                  taskType: taskData.taskType || "Task 2",
                  targetBand: 7.0,
                  ...(taskData.visual != null ? { visual: taskData.visual } : {}),
                }),
              })

              if (!response.ok) {
                throw new Error("Failed to generate AI sample essay")
              }

              const data = await response.json()
              if (!isMounted) return

              setAiSampleEssay(data.essay)
              
              // Update versions with AI sample
              setVersions((prev) => {
                const updated = [...prev]
                updated[1].text = data.essay
                return updated
              })
            } catch (error) {
              console.error("Error generating AI sample:", error)
              if (!isMounted) return
              
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate AI sample essay",
                variant: "destructive",
              })
              
              // Set fallback text
              setVersions((prev) => {
                const updated = [...prev]
                updated[1].text = "Unable to generate AI sample essay. Please try again later."
                return updated
              })
            } finally {
              if (isMounted) {
                setGeneratingAI(false)
              }
            }
          } else {
            setVersions((prev) => {
              const updated = [...prev]
              updated[1].text = "No prompt available for this task"
              return updated
            })
          }
        }
      } catch (error) {
        console.error("Error fetching task:", error)
        if (!isMounted) return
        
        toast({
          title: "Error",
          description: "Failed to load task data",
          variant: "destructive",
        })
      } finally {
        if (isMounted) {
          setLoadingTask(false)
        }
      }
    }

    if (!authLoading) {
      fetchTaskAndGenerateAI()
    }

    return () => {
      isMounted = false
    }
  }, [authLoading, taskId, user, toast])

  const getVersionText = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId)
    return version?.text || ""
  }

  const getTextClassName = () => {
    return `text-sm leading-relaxed ${wrapText ? "whitespace-pre-wrap" : "whitespace-pre overflow-x-auto"}`
  }

  if (authLoading || loadingTask) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view this page.</p>
        </CardContent>
      </Card>
    )
  }

  if (!task) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Task not found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/tasks/${taskId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">Compare Versions</h1>
        <Button variant="outline" size="icon" onClick={() => setWrapText(!wrapText)} className="bg-transparent">
          <WrapText className="h-4 w-4" />
        </Button>
      </div>

      <Card className="rounded-2xl border-border bg-card mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Version A</label>
              <Select value={versionA} onValueChange={setVersionA}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === versionB}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Version B</label>
              <Select value={versionB} onValueChange={setVersionB}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === versionA}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {task.prompt && (
        <Card className="rounded-2xl border-border bg-card mb-6">
          <CardHeader>
            <CardTitle className="text-base">Task Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {task.prompt}
            </div>
            {task.visual != null && <Task1VisualView visual={task.visual} className="mt-4" />}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">{versions.find((v) => v.id === versionA)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {generatingAI && versionA === "v2" ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Generating AI sample essay...</span>
              </div>
            ) : (
              <div className={getTextClassName()}>
                {getVersionText(versionA)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">{versions.find((v) => v.id === versionB)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {generatingAI && versionB === "v2" ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Generating AI sample essay...</span>
              </div>
            ) : (
              <div className={getTextClassName()}>
                {getVersionText(versionB)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle>Comparison Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Original Submission</h3>
              <p className="text-sm text-muted-foreground">
                Your submitted essay for this task. Word count: {task.wordCount || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">AI Suggested Revision</h3>
              <p className="text-sm text-muted-foreground">
                A sample essay generated by AI based on the task prompt, demonstrating band 7.0 level writing.
                {aiSampleEssay && ` Word count: ${aiSampleEssay.split(/\s+/).length}`}
              </p>
            </div>
            {task.overallBand && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Your Score</h3>
                <p className="text-sm text-muted-foreground">
                  Overall Band: <span className="font-semibold text-foreground">{task.overallBand}</span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

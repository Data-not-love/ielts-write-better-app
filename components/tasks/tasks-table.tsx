"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { useAuth } from "@/components/auth/auth-provider"
import { subscribeToTasks } from "@/lib/firebase-firestore"
import type { TaskDocument } from "@/types/tasks"

const formatTimestamp = (value?: TaskDocument["updatedAt"]) => {
  if (!value) {
    return "—"
  }

  try {
    const date = "toDate" in value ? value.toDate() : new Date(value as unknown as string)
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  } catch (error) {
    console.error("Failed to format timestamp:", error)
    return "—"
  }
}

export function TasksTable() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskDocument[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      // Reset when signed out; the subscription below owns this state otherwise
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTasks([])
      setIsLoading(false)
      setLoadError(null)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    const unsubscribe = subscribeToTasks(
      user.uid,
      (data) => {
        setTasks(data ?? [])
        setIsLoading(false)
        setLoadError(null)
      },
      (error) => {
        console.error("Task subscription error:", error)
        setTasks([])
        setIsLoading(false)
        setLoadError("We couldn't load your tasks. Please try again.")
      },
    )

    return () => {
      unsubscribe()
    }
  }, [authLoading, retryKey, user])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = task.title || task.prompt || ""
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === "all" || task.taskType === typeFilter
      const matchesStatus =
        statusFilter === "all" || task.status?.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesType && matchesStatus
    })
  }, [search, statusFilter, tasks, typeFilter])

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "scored":
        return "success"
      case "submitted":
        return "default"
      case "draft":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" id="your-tasks" data-toc-title="Your Tasks">Your Tasks</h1>
        <Link href="/tasks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-border bg-card" id="tasks-list" data-toc-title="Tasks List">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by prompt/topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Task 1">Task 1</SelectItem>
                <SelectItem value="Task 2">Task 2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <EmptyState
              icon={AlertCircle}
              title="Tasks unavailable"
              description={loadError}
              action={{
                label: "Try again",
                onClick: () => setRetryKey((prev) => prev + 1),
              }}
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={user ? "No tasks found" : "Sign in to see your tasks"}
              description={
                user
                  ? "Try adjusting your filters or create a new task to get started."
                  : "Create an account or sign in to start tracking your IELTS practice essays."
              }
              action={{
                label: user ? "Create New Task" : "Go to Dashboard",
                onClick: () => router.push(user ? "/tasks/new" : "/"),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Updated</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {task.title || task.prompt || "Untitled Task"}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{task.taskType || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusVariant(task.status || "draft")}>{
                          task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "Draft"
                        }</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const band = task.overallBand ?? task.feedback?.overallBand
                          if (typeof band === "number") {
                            return (
                              <span className="text-sm font-semibold text-primary">
                                {band.toFixed(1)}
                              </span>
                            )
                          }
                          return <span className="text-sm text-muted-foreground">-</span>
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{formatTimestamp(task.updatedAt)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

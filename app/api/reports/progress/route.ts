import { NextRequest } from "next/server"
import { getAdminDb, requireUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/firebase-admin"
import type { TaskDocument } from "@/types/tasks"
import type { ProgressReportData } from "@/types/reports"
import {
  filterTasksByDateRange,
  calculateOverallScoreTrend,
  calculateCriteriaTrends,
  calculateCriteriaBreakdown,
  extractCommonIssues,
  generatePersonalizedFeedback,
  calculateOverallTrendString,
  calculateCurrentOverallAverage,
  calculateBestRecentScore,
  calculateTaskTypeStats,
  getRecentSubmissions,
  generateTargetBasedRecommendations,
  calculateFirstSubmissionScores
} from "@/lib/report-analytics"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req)
    const { dateRange, taskType, targetBand } = await req.json()

    if (!dateRange || ![7, 30, 90].includes(dateRange)) {
      return Response.json({ error: "Invalid dateRange. Must be 7, 30, or 90" }, { status: 400 })
    }

    // Fetch all tasks for the user
    const tasksSnapshot = await getAdminDb()
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .orderBy("updatedAt", "desc")
      .get()
    // Admin Timestamps expose the same toDate()/toMillis() API used by the analytics helpers
    const allTasks = tasksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as TaskDocument[]
    
    // Filter tasks that have been scored (have overallBand)
    let scoredTasks = allTasks.filter(task => 
      task.overallBand !== undefined && 
      task.createdAt
    )
    
    // Apply task type filter if provided
    if (taskType && taskType !== "all") {
      scoredTasks = scoredTasks.filter(task => task.taskType === taskType)
    }

    if (scoredTasks.length === 0) {
      // Return empty state
      return Response.json({
        overallScoreTrend: [],
        criteriaTrends: { TR: [], CC: [], LR: [], GRA: [] },
        practiceTime: {
          hoursThisWeek: 0,
          hoursThisMonth: 0,
          tasksCompleted: 0
        },
        criteriaBreakdown: {
          range: dateRange === 7 ? "7d" : dateRange === 30 ? "30d" : "90d",
          TR: 0,
          CC: 0,
          LR: 0,
          GRA: 0
        },
        commonIssues: [],
        personalizedFeedback: {
          overallSummary: "No essays submitted yet. Start writing to get personalized feedback!",
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        overallScoreTrendValue: "+0.0 since start",
        currentOverallAverage: 0,
        bestRecentScore: 0,
        totalSubmissions: 0,
        taskTypeStats: [],
        recentSubmissions: []
      } as ProgressReportData)
    }

    // Filter tasks by date range for specific calculations
    const filteredTasks = filterTasksByDateRange(scoredTasks, dateRange)

    // Calculate all analytics
    const overallScoreTrend = calculateOverallScoreTrend(scoredTasks)
    const criteriaTrends = calculateCriteriaTrends(scoredTasks)
    const criteriaBreakdown = calculateCriteriaBreakdown(scoredTasks, dateRange)
    const commonIssues = extractCommonIssues(scoredTasks, dateRange)
    const personalizedFeedback = generatePersonalizedFeedback(
      filteredTasks, 
      criteriaBreakdown, 
      commonIssues
    )
    const overallScoreTrendValue = calculateOverallTrendString(overallScoreTrend)
    
    // New analytics
    const currentOverallAverage = calculateCurrentOverallAverage(filteredTasks)
    const bestRecentScore = calculateBestRecentScore(scoredTasks, dateRange)
    const taskTypeStats = calculateTaskTypeStats(scoredTasks)
    const recentSubmissions = getRecentSubmissions(scoredTasks, 10)
    const firstSubmissionScores = calculateFirstSubmissionScores(scoredTasks)

    // Calculate practice time metrics
    const practiceTime = calculatePracticeTime(allTasks)

    const reportData: ProgressReportData = {
      overallScoreTrend,
      criteriaTrends,
      practiceTime,
      criteriaBreakdown,
      commonIssues,
      personalizedFeedback,
      overallScoreTrendValue,
      currentOverallAverage,
      bestRecentScore,
      totalSubmissions: scoredTasks.length,
      taskTypeStats,
      recentSubmissions,
      firstSubmissionScores
    }
    
    // Add target-based recommendations if target is provided
    if (targetBand && targetBand >= 5.0 && targetBand <= 9.0) {
      reportData.targetBasedRecommendations = generateTargetBasedRecommendations(
        scoredTasks,
        criteriaBreakdown,
        targetBand,
        currentOverallAverage,
        taskTypeStats
      )
    }

    return Response.json(reportData)
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse()
    console.error("[progress-report] Error:", error)
    return Response.json(
      { error: "Failed to generate progress report" },
      { status: 500 }
    )
  }
}

/**
 * Calculate practice time metrics based on tasks
 */
function calculatePracticeTime(tasks: TaskDocument[]) {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Filter tasks by time period
  const tasksThisWeek = tasks.filter(task => {
    if (!task.createdAt) return false
    return task.createdAt.toDate() >= oneWeekAgo
  })

  const tasksThisMonth = tasks.filter(task => {
    if (!task.createdAt) return false
    return task.createdAt.toDate() >= oneMonthAgo
  })

  // Estimate hours based on word count (average 20 words per minute)
  const estimateHours = (taskList: TaskDocument[]) => {
    const totalWords = taskList.reduce((sum, task) => sum + (task.wordCount || 0), 0)
    const minutes = totalWords / 20
    return Math.round((minutes / 60) * 10) / 10
  }

  return {
    hoursThisWeek: estimateHours(tasksThisWeek),
    hoursThisMonth: estimateHours(tasksThisMonth),
    tasksCompleted: tasks.filter(task => task.overallBand !== undefined).length
  }
}

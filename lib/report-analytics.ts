// Analytics utilities for progress reports
import type { TaskDocument, CriterionKey } from "@/types/tasks"
import type { 
  WeeklyScoreData, 
  CriteriaScoreData, 
  CommonIssue, 
  CriteriaBreakdown,
  PersonalizedFeedback 
} from "@/types/reports"

/**
 * Calculate the number of days between two dates
 */
function getDaysDiff(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Filter tasks within the specified date range
 */
export function filterTasksByDateRange(
  tasks: TaskDocument[],
  dateRange: 7 | 30 | 90
): TaskDocument[] {
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000)
  
  return tasks.filter(task => {
    if (!task.createdAt) return false
    const taskDate = task.createdAt.toDate()
    return taskDate >= cutoffDate
  })
}

/**
 * Calculate overall score trend data grouped by weeks
 */
export function calculateOverallScoreTrend(tasks: TaskDocument[]): WeeklyScoreData[] {
  if (tasks.length === 0) return []
  
  // Sort tasks by date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return a.createdAt.toMillis() - b.createdAt.toMillis()
  })
  
  // Group by week
  const weekMap = new Map<number, number[]>()
  const firstDate = sortedTasks[0]?.createdAt?.toDate()
  
  if (!firstDate) return []
  
  sortedTasks.forEach(task => {
    if (!task.createdAt || task.overallBand === undefined) return
    
    const taskDate = task.createdAt.toDate()
    const weekNumber = Math.floor(getDaysDiff(firstDate, taskDate) / 7)
    
    if (!weekMap.has(weekNumber)) {
      weekMap.set(weekNumber, [])
    }
    weekMap.get(weekNumber)!.push(task.overallBand)
  })
  
  // Calculate average for each week
  const result: WeeklyScoreData[] = []
  weekMap.forEach((scores, week) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    result.push({ week: week + 1, score: Math.round(average * 10) / 10 })
  })
  
  return result.sort((a, b) => a.week - b.week)
}

/**
 * Calculate criteria trends over time
 */
export function calculateCriteriaTrends(tasks: TaskDocument[]): {
  TR: CriteriaScoreData[]
  CC: CriteriaScoreData[]
  LR: CriteriaScoreData[]
  GRA: CriteriaScoreData[]
} {
  if (tasks.length === 0) {
    return { TR: [], CC: [], LR: [], GRA: [] }
  }
  
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return a.createdAt.toMillis() - b.createdAt.toMillis()
  })
  
  const firstDate = sortedTasks[0]?.createdAt?.toDate()
  if (!firstDate) return { TR: [], CC: [], LR: [], GRA: [] }
  
  const criteriaWeeks: Record<CriterionKey, Map<number, number[]>> = {
    TR: new Map(),
    CC: new Map(),
    LR: new Map(),
    GRA: new Map()
  }
  
  sortedTasks.forEach(task => {
    if (!task.createdAt || !task.feedback) return
    
    const taskDate = task.createdAt.toDate()
    const weekNumber = Math.floor(getDaysDiff(firstDate, taskDate) / 7)
    
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(criterion => {
      const score = task.feedback?.criteria?.[criterion]?.score
      if (score !== undefined) {
        if (!criteriaWeeks[criterion].has(weekNumber)) {
          criteriaWeeks[criterion].set(weekNumber, [])
        }
        criteriaWeeks[criterion].get(weekNumber)!.push(score)
      }
    })
  })
  
  // Calculate averages
  const result: Record<CriterionKey, CriteriaScoreData[]> = { TR: [], CC: [], LR: [], GRA: [] }
  
  ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(criterion => {
    criteriaWeeks[criterion].forEach((scores, week) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
      result[criterion].push({ 
        week: week + 1, 
        score: Math.round(average * 10) / 10 
      })
    })
    result[criterion].sort((a, b) => a.week - b.week)
  })
  
  return result
}

/**
 * Calculate criteria breakdown (average scores) for date range
 */
export function calculateCriteriaBreakdown(
  tasks: TaskDocument[],
  range: 7 | 30 | 90
): CriteriaBreakdown {
  const filteredTasks = filterTasksByDateRange(tasks, range)
  
  const criteriaScores: Record<CriterionKey, number[]> = {
    TR: [],
    CC: [],
    LR: [],
    GRA: []
  }
  
  filteredTasks.forEach(task => {
    if (!task.feedback) return
    
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(criterion => {
      const score = task.feedback?.criteria?.[criterion]?.score
      if (score !== undefined) {
        criteriaScores[criterion].push(score)
      }
    })
  })
  
  const rangeMap = { 7: "7d", 30: "30d", 90: "90d" } as const
  
  return {
    range: rangeMap[range],
    TR: calculateAverage(criteriaScores.TR),
    CC: calculateAverage(criteriaScores.CC),
    LR: calculateAverage(criteriaScores.LR),
    GRA: calculateAverage(criteriaScores.GRA)
  }
}

/**
 * Extract common issues from tasks
 */
export function extractCommonIssues(
  tasks: TaskDocument[],
  dateRange: 7 | 30 | 90
): CommonIssue[] {
  const allTasks = filterTasksByDateRange(tasks, dateRange)
  const halfRange = Math.floor(dateRange / 2)
  const recentTasks = filterTasksByDateRange(tasks, halfRange as 7 | 30 | 90)
  
  // Count all issues and track their criterion
  const issueCount = new Map<string, number>()
  const recentIssueCount = new Map<string, number>()
  const issueCriterion = new Map<string, CriterionKey>()
  
  allTasks.forEach(task => {
    if (!task.feedback) return
    
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(criterion => {
      const issues = task.feedback?.criteria?.[criterion]?.issues || []
      issues.forEach(issue => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1)
        // Store the criterion for this issue (first occurrence)
        if (!issueCriterion.has(issue)) {
          issueCriterion.set(issue, criterion)
        }
      })
    })
  })
  
  recentTasks.forEach(task => {
    if (!task.feedback) return
    
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(criterion => {
      const issues = task.feedback?.criteria?.[criterion]?.issues || []
      issues.forEach(issue => {
        recentIssueCount.set(issue, (recentIssueCount.get(issue) || 0) + 1)
      })
    })
  })
  
  // Convert to array and sort by count
  const commonIssues: CommonIssue[] = []
  issueCount.forEach((count, issue) => {
    const recentCount = recentIssueCount.get(issue) || 0
    const avgOlder = allTasks.length > recentTasks.length 
      ? (count - recentCount) / (allTasks.length - recentTasks.length)
      : 0
    const avgRecent = recentTasks.length > 0 ? recentCount / recentTasks.length : 0
    
    let trend: "Improving" | "Worsening" | "Stable" = "Stable"
    const difference = avgRecent - avgOlder
    
    if (difference < -0.1) {
      trend = "Improving"
    } else if (difference > 0.1) {
      trend = "Worsening"
    }
    
    commonIssues.push({ 
      name: issue, 
      count, 
      trend,
      relatedCriterion: issueCriterion.get(issue)
    })
  })
  
  return commonIssues.sort((a, b) => b.count - a.count).slice(0, 5)
}

/**
 * Helper function to pluralize essay/essays
 */
function pluralizeEssay(count: number): string {
  return `${count} essay${count === 1 ? '' : 's'}`
}

/**
 * Extract actual recommendations from task feedback for weakest skills
 */
function extractFeedbackRecommendations(
  tasks: TaskDocument[],
  criteriaScores: Array<{ name: string; score: number; label: string }>
): Array<{ title: string; description: string; relatedCriterion: "TR" | "CC" | "LR" | "GRA" | "Overall" }> {
  const recommendations: Array<{ title: string; description: string; relatedCriterion: "TR" | "CC" | "LR" | "GRA" | "Overall" }> = []
  
  // Focus on the weakest 2 skills
  const weakSkills = criteriaScores.slice(-2)
  
  weakSkills.forEach(skill => {
    // Collect suggestions and issues for this skill from all tasks
    const skillFeedback: string[] = []
    tasks.forEach(task => {
      if (!task.feedback?.criteria) return
      
      const criterion = task.feedback.criteria[skill.name as CriterionKey]
      if (criterion) {
        const suggestions = criterion.suggestions || []
        const issues = criterion.issues || []
        skillFeedback.push(...suggestions, ...issues)
      }
    })
    
    // Get unique feedback items (deduplicate similar ones)
    const uniqueFeedback = Array.from(new Set(skillFeedback))
    
    // Create a recommendation from the most common feedback
    if (uniqueFeedback.length > 0) {
      // Take up to 3 most relevant pieces of feedback
      const topFeedback = uniqueFeedback.slice(0, 3)
      const joinedFeedback = topFeedback.join(" ")
      recommendations.push({
        title: `Improve ${skill.label}`,
        description: joinedFeedback + (joinedFeedback.endsWith(".") ? "" : "."),
        relatedCriterion: skill.name as "TR" | "CC" | "LR" | "GRA"
      })
    }
  })
  
  return recommendations
}

/**
 * Generate personalized feedback based on scores and trends
 */
export function generatePersonalizedFeedback(
  tasks: TaskDocument[],
  criteriaBreakdown: CriteriaBreakdown,
  commonIssues: CommonIssue[]
): PersonalizedFeedback {
  if (tasks.length === 0) {
    return {
      overallSummary: "No essays submitted yet. Start writing to get personalized feedback!",
      strengths: [],
      weaknesses: [],
      recommendations: []
    }
  }
  
  // Calculate overall trend
  const scoreTrend = calculateOverallScoreTrend(tasks)
  const trendDirection = scoreTrend.length >= 2 
    ? scoreTrend[scoreTrend.length - 1].score - scoreTrend[0].score 
    : 0
  
  // Identify strengths (highest scoring criteria with positive trend)
  const criteriaScores = [
    { name: "TR", score: criteriaBreakdown.TR, label: "Task Response" },
    { name: "CC", score: criteriaBreakdown.CC, label: "Coherence & Cohesion" },
    { name: "LR", score: criteriaBreakdown.LR, label: "Lexical Resource" },
    { name: "GRA", score: criteriaBreakdown.GRA, label: "Grammar & Accuracy" }
  ].sort((a, b) => b.score - a.score)
  
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  // Top 2 criteria are strengths
  if (criteriaScores[0].score >= 6.0) {
    strengths.push(`Strong performance in ${criteriaScores[0].label} (${criteriaScores[0].score})`)
  }
  if (criteriaScores[1].score >= 6.0) {
    strengths.push(`Good progress in ${criteriaScores[1].label} (${criteriaScores[1].score})`)
  }
  
  // Bottom 2 criteria are weaknesses
  if (criteriaScores[3].score < 7.0) {
    weaknesses.push(`${criteriaScores[3].label} needs improvement (${criteriaScores[3].score})`)
  }
  if (criteriaScores[2].score < 7.0) {
    weaknesses.push(`${criteriaScores[2].label} could be enhanced (${criteriaScores[2].score})`)
  }
  
  // Add common issues to weaknesses
  const worseningIssues = commonIssues.filter(issue => issue.trend === "Worsening")
  if (worseningIssues.length > 0) {
    weaknesses.push(`Increasing errors: ${worseningIssues[0].name}`)
  }
  
  // Generate recommendations based on actual feedback data
  const recommendations: PersonalizedFeedback["recommendations"] = []
  
  // Extract actual suggestions from user's feedback
  const feedbackBasedRecommendations = extractFeedbackRecommendations(tasks, criteriaScores)
  recommendations.push(...feedbackBasedRecommendations)
  
  // Add recommendations based on common issues (real data)
  if (commonIssues.length > 0) {
    commonIssues.slice(0, 2).forEach(issue => {
      if (issue.relatedCriterion) {
        recommendations.push({
          title: `Address: ${issue.name}`,
          description: `This issue appeared ${issue.count} times in your feedback and is ${issue.trend.toLowerCase()}. Focus on this area in your next essays.`,
          relatedCriterion: issue.relatedCriterion
        })
      }
    })
  }
  
  // Only suggest more practice if they have very few submissions
  if (tasks.length < 3) {
    recommendations.push({
      title: "Submit More Essays for Better Insights",
      description: `With only ${pluralizeEssay(tasks.length)} submitted, we need more data to provide personalized recommendations. Try writing 2-3 more essays to get detailed feedback patterns.`,
      relatedCriterion: "Overall"
    })
  }
  
  // Overall summary
  const overallSummary = trendDirection >= 0.5
    ? `Great progress! Your overall score has improved by ${trendDirection.toFixed(1)} points. Keep up the good work and focus on the areas highlighted below.`
    : trendDirection <= -0.5
    ? `Your scores have declined slightly. Don't be discouraged - focus on the recommendations below to get back on track.`
    : `Your performance is stable. To improve further, focus on the specific areas highlighted in the recommendations.`
  
  return {
    overallSummary,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 5)
  }
}

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((acc, num) => acc + num, 0)
  return Math.round((sum / numbers.length) * 10) / 10
}

/**
 * Calculate overall score trend string (e.g., "+1.5 since start")
 */
export function calculateOverallTrendString(scoreTrend: WeeklyScoreData[]): string {
  if (scoreTrend.length < 2) return "+0.0 since start"
  
  const firstScore = scoreTrend[0].score
  const lastScore = scoreTrend[scoreTrend.length - 1].score
  const diff = lastScore - firstScore
  
  const sign = diff >= 0 ? "+" : ""
  return `${sign}${diff.toFixed(1)} since start`
}

/**
 * Calculate current overall average
 */
export function calculateCurrentOverallAverage(tasks: TaskDocument[]): number {
  const scores = tasks
    .filter(task => task.overallBand !== undefined)
    .map(task => task.overallBand!)
  
  return calculateAverage(scores)
}

/**
 * Calculate best recent score (within a time range)
 */
export function calculateBestRecentScore(tasks: TaskDocument[], days: number = 30): number {
  const recentTasks = filterTasksByDateRange(tasks, days as 7 | 30 | 90)
  const scores = recentTasks
    .filter(task => task.overallBand !== undefined)
    .map(task => task.overallBand!)
  
  return scores.length > 0 ? Math.max(...scores) : 0
}

/**
 * Calculate first submission criteria scores (baseline for comparison)
 */
export function calculateFirstSubmissionScores(tasks: TaskDocument[]): {
  TR: number
  CC: number
  LR: number
  GRA: number
} | null {
  // Sort tasks by creation date (oldest first)
  const sortedTasks = [...tasks]
    .filter(task => task.feedback && task.createdAt)
    .sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return a.createdAt.toMillis() - b.createdAt.toMillis()
    })
  
  if (sortedTasks.length === 0) {
    return null
  }
  
  // Get the first task with feedback
  const firstTask = sortedTasks[0]
  const criteria = firstTask.feedback?.criteria
  
  if (!criteria) {
    return null
  }
  
  // Check if all criteria have scores - return null if any are missing
  const TR = criteria.TR?.score
  const CC = criteria.CC?.score
  const LR = criteria.LR?.score
  const GRA = criteria.GRA?.score
  
  if (TR === undefined || CC === undefined || LR === undefined || GRA === undefined) {
    return null
  }
  
  return { TR, CC, LR, GRA }
}

/**
 * Calculate statistics by task type
 */
export function calculateTaskTypeStats(tasks: TaskDocument[]): import("@/types/reports").TaskTypeStats[] {
  const taskTypeMap = new Map<string, number[]>()
  
  tasks.forEach(task => {
    if (task.overallBand === undefined) return
    
    const taskType = task.taskType || "Unknown"
    if (!taskTypeMap.has(taskType)) {
      taskTypeMap.set(taskType, [])
    }
    taskTypeMap.get(taskType)!.push(task.overallBand)
  })
  
  const stats: import("@/types/reports").TaskTypeStats[] = []
  taskTypeMap.forEach((scores, taskType) => {
    stats.push({
      taskType,
      averageOverall: calculateAverage(scores),
      count: scores.length
    })
  })
  
  return stats.sort((a, b) => b.count - a.count)
}

/**
 * Get recent submissions with key information
 */
export function getRecentSubmissions(
  tasks: TaskDocument[], 
  limit: number = 10
): import("@/types/reports").RecentSubmission[] {
  const sortedTasks = [...tasks]
    .filter(task => task.overallBand !== undefined && task.feedback)
    .sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0
      return b.updatedAt.toMillis() - a.updatedAt.toMillis()
    })
    .slice(0, limit)
  
  return sortedTasks.map(task => {
    // Find weakest skill
    const criteria = task.feedback?.criteria
    const skillScores: Array<{ skill: CriterionKey; score: number }> = []
    
    if (criteria) {
      (["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(skill => {
        const score = criteria[skill]?.score
        if (score !== undefined) {
          skillScores.push({ skill, score })
        }
      })
    }
    
    skillScores.sort((a, b) => a.score - b.score)
    const weakest = skillScores[0] || { skill: "TR" as CriterionKey, score: 0 }
    
    // Get key suggestion from weakest skill
    const keySuggestion = criteria?.[weakest.skill]?.suggestions?.[0] || 
                         criteria?.[weakest.skill]?.issues?.[0] ||
                         "Continue practicing"
    
    return {
      id: task.id,
      title: task.title || "Untitled Essay",
      taskType: task.taskType || "Unknown",
      overallBand: task.overallBand!,
      weakestSkill: weakest.skill,
      weakestSkillScore: weakest.score,
      keySuggestion,
      createdAt: task.updatedAt?.toDate().toISOString() || new Date().toISOString()
    }
  })
}

/**
 * Calculate skill priority based on target
 */
export function calculateSkillPriority(
  criteriaBreakdown: import("@/types/reports").CriteriaBreakdown,
  targetBand: number
): import("@/types/reports").SkillPriority {
  const skills: CriterionKey[] = ["TR", "CC", "LR", "GRA"]
  const skillGaps: Array<{ skill: CriterionKey; gap: import("@/types/reports").SkillGap }> = []
  
  skills.forEach(skill => {
    const current = criteriaBreakdown[skill]
    const gap = targetBand - current
    
    let priority: "high" | "medium" | "low" = "low"
    if (gap >= 1.5) priority = "high"
    else if (gap >= 0.5) priority = "medium"
    
    skillGaps.push({
      skill,
      gap: {
        current,
        target: targetBand,
        gap,
        priority
      }
    })
  })
  
  // Sort by gap (highest gap = weakest skill)
  skillGaps.sort((a, b) => b.gap.gap - a.gap.gap)
  
  const result = {} as import("@/types/reports").SkillPriority
  skillGaps.forEach(({ skill, gap }) => {
    result[skill] = gap
  })
  
  result.primaryWeakSkill = skillGaps[0].skill
  result.secondaryWeakSkill = skillGaps[1]?.skill || skillGaps[0].skill
  
  return result as import("@/types/reports").SkillPriority
}

/**
 * Extract repeated suggestions from feedback
 */
export function extractRepeatedSuggestions(
  tasks: TaskDocument[]
): import("@/types/reports").RepeatedSuggestion[] {
  const suggestionMap = new Map<string, { count: number; skill: CriterionKey }>()
  
  tasks.forEach(task => {
    if (!task.feedback) return
    
    const criteria = task.feedback.criteria
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(skill => {
      const suggestions = criteria[skill]?.suggestions || []
      const issues = criteria[skill]?.issues || []
      
      const allFeedback = suggestions.concat(issues)
      allFeedback.forEach(text => {
        // Normalize the text for better matching
        const normalized = text.toLowerCase().trim()
        
        // Skip very short feedback (less meaningful)
        if (normalized.length < 10) return
        
        // Group similar suggestions using substring matching
        // Check if there's significant overlap with existing suggestions
        let found = false
        suggestionMap.forEach((value, key) => {
          const keyPrefix = key.slice(0, 50)
          const normalizedPrefix = normalized.slice(0, 50)
          // Match if there's substantial overlap in the first 30 characters
          if (keyPrefix.includes(normalizedPrefix.slice(0, 30)) || 
              normalizedPrefix.includes(keyPrefix.slice(0, 30))) {
            value.count++
            found = true
          }
        })
        
        if (!found) {
          suggestionMap.set(normalized, { count: 1, skill })
        }
      })
    })
  })
  
  const suggestions: import("@/types/reports").RepeatedSuggestion[] = []
  suggestionMap.forEach((value, key) => {
    if (value.count >= 2) { // Only include if appeared at least twice
      suggestions.push({
        suggestion: key,
        count: value.count,
        relatedSkill: value.skill
      })
    }
  })
  
  // Return top 10 suggestions (increased from 3) so dashboard can show more
  return suggestions
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Generate study plan based on target and current performance
 */
export function generateStudyPlan(
  skillPriority: import("@/types/reports").SkillPriority,
  targetBand: number,
  currentAverage: number,
  taskTypeStats: import("@/types/reports").TaskTypeStats[]
): import("@/types/reports").StudyPlan {
  const totalGap = targetBand - currentAverage
  
  // Calculate recommended weekly tasks (more gap = more practice)
  let weeklyTasks = 2
  if (totalGap >= 1.5) weeklyTasks = 4
  else if (totalGap >= 1.0) weeklyTasks = 3
  
  // Identify focus skills (high priority)
  const focusSkills: Array<CriterionKey> = []
  ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(skill => {
    if (skillPriority[skill].priority === "high") {
      focusSkills.push(skill)
    }
  })
  
  // If no high priority, add medium priority
  if (focusSkills.length === 0) {
    ;(["TR", "CC", "LR", "GRA"] as CriterionKey[]).forEach(skill => {
      if (skillPriority[skill].priority === "medium") {
        focusSkills.push(skill)
      }
    })
  }
  
  // If still none, add the weakest
  if (focusSkills.length === 0) {
    focusSkills.push(skillPriority.primaryWeakSkill)
  }
  
  // Task type recommendations
  const taskTypeRecommendations: string[] = []
  if (taskTypeStats.length > 0) {
    // Recommend task types with lower average scores
    const sortedByScore = [...taskTypeStats].sort((a, b) => a.averageOverall - b.averageOverall)
    if (sortedByScore[0] && sortedByScore[0].averageOverall < targetBand) {
      taskTypeRecommendations.push(`Focus on ${sortedByScore[0].taskType} (current avg: ${sortedByScore[0].averageOverall})`)
    }
    
    // Also recommend balanced practice
    taskTypeRecommendations.push("Practice both Task 1 and Task 2 regularly")
  }
  
  // Estimate time to target (rough calculation)
  let estimatedWeeks = 0
  if (totalGap > 0) {
    // Assume 0.5 band improvement per 4 weeks of consistent practice
    estimatedWeeks = Math.ceil((totalGap / 0.5) * 4)
  }
  
  const estimatedTimeToTarget = estimatedWeeks === 0 
    ? "You're already at or above your target!"
    : estimatedWeeks <= 4
    ? "2-4 weeks with consistent practice"
    : estimatedWeeks <= 8
    ? "4-8 weeks with consistent practice"
    : "2-3 months with consistent practice"
  
  return {
    weeklyTasksRecommended: weeklyTasks,
    focusSkills,
    taskTypeRecommendations,
    estimatedTimeToTarget
  }
}

/**
 * Generate complete target-based recommendations
 */
export function generateTargetBasedRecommendations(
  tasks: TaskDocument[],
  criteriaBreakdown: import("@/types/reports").CriteriaBreakdown,
  targetBand: number,
  currentAverage: number,
  taskTypeStats: import("@/types/reports").TaskTypeStats[]
): import("@/types/reports").TargetBasedRecommendations {
  const skillPriority = calculateSkillPriority(criteriaBreakdown, targetBand)
  const repeatedSuggestions = extractRepeatedSuggestions(tasks)
  const studyPlan = generateStudyPlan(skillPriority, targetBand, currentAverage, taskTypeStats)
  
  return {
    skillPriority,
    repeatedSuggestions,
    studyPlan
  }
}

# Progress Reports Implementation

## Overview

This implementation adds a comprehensive progress reporting system to the IELTS WriteBetter app, allowing users to track their improvement over time with detailed analytics and personalized feedback.

## Architecture

### 1. Data Types (`types/reports.ts`)

Defines TypeScript interfaces for all report data structures:
- `ProgressReportData`: Main report data structure
- `WeeklyScoreData`: Overall score trend by week
- `CriteriaScoreData`: Individual criteria scores over time
- `CommonIssue`: Recurring issues with trend indicators
- `CriteriaBreakdown`: Average scores per criterion
- `PersonalizedFeedback`: AI-generated insights and recommendations

### 2. Analytics Engine (`lib/report-analytics.ts`)

Core calculation functions:
- `filterTasksByDateRange()`: Filter tasks by 7/30/90 day ranges
- `calculateOverallScoreTrend()`: Compute weekly score progression
- `calculateCriteriaTrends()`: Track TR, CC, LR, GRA over time
- `calculateCriteriaBreakdown()`: Average scores for selected period
- `extractCommonIssues()`: Identify and trend recurring problems
- `generatePersonalizedFeedback()`: Create AI-powered recommendations

### 3. API Endpoint (`app/api/reports/progress/route.ts`)

RESTful API endpoint:
- **Method**: POST
- **Path**: `/api/reports/progress`
- **Input**: `{ userId: string, dateRange: 7 | 30 | 90 }`
- **Output**: `ProgressReportData`

Features:
- Fetches all user tasks from Firestore
- Filters scored and submitted tasks
- Calculates all analytics metrics
- Returns comprehensive report data

### 4. Frontend Component (`components/reports/progress-reports.tsx`)

React component with:
- Real-time data fetching from API
- Date range selector (7/30/90 days)
- Loading and error states
- Multiple visualizations:
  - Criteria radar chart
  - Common issues list
  - Practice time metrics
  - Personalized feedback panel

## Features

### 1. Criteria Breakdown
- Radar chart for TR, CC, LR, GRA
- Filterable by 7/30/90 days
- Shows current vs target performance

### 2. Common Issues Analysis
- Top 5 recurring writing problems
- Trend indicators: Improving / Worsening / Stable
- Based on issue frequency comparison between periods

### 3. Personalized Feedback
- Overall progress summary
- Strengths identification
- Weaknesses to improve
- Actionable recommendations (3-5 items)
- Criterion-specific advice

### 4. Practice Time Metrics
- Hours practiced this week/month
- Total tasks completed
- Estimated from word count (20 words/min)

## Data Flow

```
User → Component → API Endpoint → Firestore
                           ↓
                   Analytics Engine
                           ↓
                  Report Data JSON
                           ↓
                   Component → UI
```

## Usage

### Backend (API)

```typescript
// POST /api/reports/progress
{
  "userId": "user123",
  "dateRange": 30
}
```

### Frontend

```tsx
import { ProgressReports } from "@/components/reports/progress-reports"

// In your page
<ProgressReports userId={currentUser.id} />
```

## Calculations

### Common Issues
1. Extract all issues from task feedback
2. Count occurrences in full date range
3. Count occurrences in recent half period
4. Compare frequencies to determine trend:
   - Improving: Recent frequency < Earlier frequency
   - Worsening: Recent frequency > Earlier frequency
   - Stable: Similar frequencies

### Personalized Feedback
1. Identify strongest criterion (highest average)
2. Identify weakest criterion (lowest average)
3. Analyze score trends (improving/declining)
4. Review top common issues
5. Generate targeted recommendations based on:
   - Weakest criterion
   - Most common issues
   - Practice volume
   - Overall progress

## API Response Example

```json
{
  "overallScoreTrend": [
    { "week": 1, "score": 6.0 },
    { "week": 2, "score": 6.5 },
    { "week": 3, "score": 7.0 }
  ],
  "criteriaTrends": {
    "TR": [{ "week": 1, "score": 6.0 }, ...],
    "CC": [{ "week": 1, "score": 6.5 }, ...],
    "LR": [{ "week": 1, "score": 5.5 }, ...],
    "GRA": [{ "week": 1, "score": 6.0 }, ...]
  },
  "practiceTime": {
    "hoursThisWeek": 8.5,
    "hoursThisMonth": 32,
    "tasksCompleted": 15
  },
  "criteriaBreakdown": {
    "range": "30d",
    "TR": 6.5,
    "CC": 7.0,
    "LR": 6.0,
    "GRA": 6.5
  },
  "commonIssues": [
    { "name": "Limited vocabulary range", "count": 12, "trend": "Improving" },
    { "name": "Comma splices", "count": 8, "trend": "Stable" }
  ],
  "personalizedFeedback": {
    "overallSummary": "Great progress! Your overall score has improved by 1.0 points...",
    "strengths": [
      "Strong performance in Coherence & Cohesion (7.0)",
      "Good progress in Task Response (6.5)"
    ],
    "weaknesses": [
      "Lexical Resource needs improvement (6.0)",
      "Grammar & Accuracy could be enhanced (6.5)"
    ],
    "recommendations": [
      {
        "title": "Expand Vocabulary Range",
        "description": "Build your lexical resource by learning topic-specific vocabulary...",
        "relatedCriterion": "LR"
      }
    ]
  },
  "overallScoreTrendValue": "+1.0 since start"
}
```

## Future Enhancements

1. **AI-Powered Issue Detection**: Use Gemini API to analyze essays and extract more detailed issues
2. **Goal Setting**: Allow users to set target band scores and track progress
3. **Comparative Analytics**: Compare with other users (anonymized) or IELTS benchmarks
4. **Export Reports**: Generate PDF reports for sharing or printing
5. **Email Summaries**: Weekly/monthly progress emails
6. **Detailed Issue Analysis**: Click into issues to see examples and suggestions

## Testing

The implementation has been:
- ✅ Built successfully with no TypeScript errors
- ✅ Checked with CodeQL for security vulnerabilities (0 alerts)
- ✅ Integrated with existing Firebase Firestore data
- ✅ Compatible with existing UI components

## Dependencies

- Firebase Firestore (for data storage)
- Recharts (for visualizations)
- Next.js 15 (App Router)
- TypeScript

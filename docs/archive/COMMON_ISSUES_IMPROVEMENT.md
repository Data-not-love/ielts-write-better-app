# Common Issues Improvement Suggestions - Implementation Guide

## Overview

This document describes the interactive improvement suggestions feature for the Common Issues section in the Progress Reports page.

## Problem Statement

The user requested:
1. Verify if common issues are using mock data or real data from scored essays
2. Make common issues interactive so users can get detailed improvement guidance
3. Integrate with API to generate personalized suggestions when users click on issues

## Solution

### Data Source Verification

✅ **Common Issues are NOT mock data**

The common issues are extracted from real scored essay data:
- Source: `lib/report-analytics.ts` → `extractCommonIssues()` function
- Data flow: `TaskDocument.feedback.criteria[TR|CC|LR|GRA].issues[]`
- Processing: Issues are counted across all user's scored tasks within the selected date range
- Tracking: Each issue's trend (Improving/Worsening/Stable) is calculated by comparing recent vs older occurrences

### Architecture

```
User clicks issue → Dialog opens → API call → Gemini AI → Structured suggestions → Display
```

#### Components

1. **Frontend Component**: `components/reports/progress-reports.tsx`
   - Displays common issues as clickable cards
   - Opens dialog when issue is clicked
   - Handles loading states and error handling
   - Shows AI-generated suggestions

2. **API Endpoint**: `/api/reports/improvement-suggestions`
   - Method: POST
   - Rate Limited: Yes (via `withRateLimit`)
   - Input: `{ issueName, relatedCriterion, userLevel }`
   - Output: `{ issueName, relatedCriterion, suggestions, generatedAt }`

3. **Data Types**: `types/reports.ts`
   - Extended `CommonIssue` interface with `relatedCriterion` field
   - Tracks which IELTS criterion each issue relates to

4. **Analytics**: `lib/report-analytics.ts`
   - Enhanced `extractCommonIssues()` to track criterion for each issue
   - Maps issues to their source criterion (TR/CC/LR/GRA)

## Features

### User Interface

- **Visual Indicators**:
  - Hover effect on issue cards
  - Chevron icon showing clickability
  - Cursor pointer on hover
  - Criterion badge showing TR/CC/LR/GRA

- **Dialog**:
  - Large modal (max-width: 3xl)
  - Scrollable content
  - Loading spinner while generating suggestions
  - Error handling with retry option

### AI-Generated Content

The API generates comprehensive guidance including:

1. **What this issue means**: Clear explanation and why it's problematic
2. **How to fix it**: Step-by-step guidance
3. **Examples**: 
   - Incorrect example demonstrating the issue
   - Corrected version
   - Explanation of improvements
4. **Practice tips**: Specific exercises to avoid the issue
5. **Quick checklist**: 3-4 actionable points for reference while writing

### Personalization

Suggestions are tailored based on:
- The specific issue name
- Related IELTS criterion (TR/CC/LR/GRA)
- User's current band level (average score)

## Code Changes

### New Files

1. `app/api/reports/improvement-suggestions/route.ts` (75 lines)
   - API endpoint for generating suggestions
   - Uses Gemini 1.5 Flash model
   - Rate limited for API quota management

### Modified Files

1. `components/reports/progress-reports.tsx` (+90 lines)
   - Added state for dialog and suggestions
   - Added `handleIssueClick()` function
   - Made issue cards clickable
   - Added improvement suggestions dialog

2. `lib/report-analytics.ts` (+14 lines)
   - Track criterion for each issue
   - Add `issueCriterion` Map
   - Include `relatedCriterion` in returned issues

3. `types/reports.ts` (+1 line)
   - Added optional `relatedCriterion` field to `CommonIssue`

## Usage

### For Users

1. Navigate to Reports page (`/reports`)
2. Scroll to "Common Issues" section
3. Click on any issue card
4. Wait for AI to generate personalized suggestions
5. Read and apply the guidance

### For Developers

To add more context to suggestions:

```typescript
const response = await fetch("/api/reports/improvement-suggestions", {
  method: "POST",
  body: JSON.stringify({
    issueName: "Missing topic sentences",
    relatedCriterion: "CC",
    userLevel: 6.5,
    // Add more context as needed
  }),
})
```

To customize the AI prompt:

Edit `app/api/reports/improvement-suggestions/route.ts` and modify the `prompt` variable.

## Testing

### Unit Testing

Common issues extraction is tested through the existing analytics flow:
- Real task data is used
- Issues are properly counted and categorized
- Trends are accurately calculated

### Integration Testing

To test the feature:
1. Create and score several essays
2. Ensure some essays have recurring issues
3. Navigate to Reports page
4. Verify common issues appear
5. Click an issue and verify suggestions load

### Manual Testing

Tested scenarios:
- ✅ Build succeeds
- ✅ TypeScript types are correct
- ✅ API endpoint is properly protected
- ✅ Rate limiting is applied
- ✅ No security vulnerabilities (CodeQL clean)

## Security

- ✅ API endpoint is rate-limited
- ✅ Input validation on required fields
- ✅ Error handling prevents information leakage
- ✅ No sensitive data exposed in responses
- ✅ CodeQL analysis: 0 alerts

## Performance

- API uses Gemini 1.5 Flash (faster model)
- Rate limiting prevents quota exhaustion
- Lazy loading: suggestions only fetched when clicked
- Dialog prevents multiple simultaneous requests

## Future Enhancements

Potential improvements:
1. Cache suggestions for common issues
2. Allow users to provide feedback on suggestions
3. Track which suggestions users find most helpful
4. Generate practice exercises based on issues
5. Integrate with essay editor for in-context help
6. Add example essays showing the fix in action

## Dependencies

- `@google/generative-ai`: Gemini API client
- `@radix-ui/react-dialog`: Dialog component
- `lucide-react`: Icons (ChevronRight, AlertCircle, Loader2)
- Existing rate limiting infrastructure

## Configuration

Environment variables required:
- `GEMINI_API_KEY`: Google Gemini API key

## Troubleshooting

**Issue**: Dialog doesn't open when clicking
- Check browser console for errors
- Verify user has scored essays with issues
- Check network tab for API errors

**Issue**: Suggestions take too long
- Normal: AI generation can take 5-10 seconds
- Check rate limiting isn't queuing requests
- Verify Gemini API quota isn't exceeded

**Issue**: Empty common issues
- User needs scored essays with feedback
- Issues must occur at least once in date range
- Check date range filter settings

## Related Documentation

- `VIETNAMESE_SUMMARY.md`: Rate limiting implementation
- `RATE_LIMITING.md`: Rate limiter details
- `REPORT_IMPLEMENTATION.md`: Reports feature overview

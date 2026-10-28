# Recommendations Improvement: From Mock to Data-Driven

## Problem Statement

Previously, the dashboard showed **mock/generic recommendations** that were the same for all users with similar weak areas. For example, all users weak in "Grammar & Accuracy" would see the same generic advice: "Review complex sentence structures and reduce grammatical errors."

The goal was to make **ALL recommendations based on actual feedback from submitted essays**, not generic templates.

## What Was Mock/Generic?

### Before Changes

In `lib/report-analytics.ts`, the `generatePersonalizedFeedback()` function had:

1. **Hard-coded recommendation templates** (lines 309-331):
   ```typescript
   const criterionRecommendations: Record<string, any> = {
     TR: {
       title: "Improve Task Response",
       description: "Practice addressing all parts of the question directly..."
     },
     CC: {
       title: "Enhance Coherence & Cohesion",
       description: "Work on paragraph structure and use more varied linking words..."
     },
     // ... etc
   }
   ```

2. **Generic keyword-based recommendations** (lines 337-356):
   - If issue contains "vocabulary" → show generic vocabulary advice
   - If issue contains "grammar" → show generic grammar advice
   - Generic templates that don't reference user's specific problems

3. **Generic practice volume recommendation** (lines 359-365):
   - Always showed for users with < 10 submissions
   - Not based on actual performance data

## Changes Made

### 1. New Helper Function: `extractFeedbackRecommendations()`

**Location**: `lib/report-analytics.ts` (lines 247-289)

```typescript
function extractFeedbackRecommendations(
  tasks: TaskDocument[],
  criteriaScores: Array<{ name: string; score: number; label: string }>
)
```

**What it does**:
- Identifies the **2 weakest skills** from user's actual scores
- Extracts **real suggestions and issues** from the AI feedback for those skills
- Combines the actual feedback into actionable recommendations
- Returns recommendations with the **exact wording from user's essay feedback**

**Example output**:
- Instead of: "Improve Task Response - Practice addressing all parts..."
- Now shows: "Improve Task Response - Address all parts of the question more directly. Provide more specific examples. Develop your ideas more fully."
  (This comes from actual feedback on the user's essays)

### 2. Updated `generatePersonalizedFeedback()`

**Changes**:
- **Removed**: All generic recommendation templates (56 lines of mock data)
- **Added**: Call to `extractFeedbackRecommendations()` to get real suggestions
- **Updated**: Common issues now show count and trend from actual data
- **Changed**: Practice volume recommendation only for users with < 3 submissions (was < 10)

**Code flow now**:
1. Extract real feedback from weak skills → recommendations
2. Add common issues with their actual occurrence count → recommendations
3. Only if < 3 submissions, suggest submitting more essays

### 3. Improved `extractRepeatedSuggestions()`

**Changes**:
- **Increased limit**: Returns top 10 suggestions (was 3)
- **Better filtering**: Skips feedback shorter than 10 characters
- **Improved matching**: Uses 50-character prefix for better deduplication
- **More context**: Helps dashboard show more personalized insights

**Why**: The dashboard shows up to 4 repeated suggestions. Having only 3 available was limiting.

## What's Data-Driven Now?

### ✅ Fully Data-Driven (Based on Actual Essays)

1. **Repeated Suggestions Section** (Dashboard "Key Recommendations")
   - Shows actual feedback text from user's essays
   - Shows exact count of how many times it appeared
   - All from real AI feedback on submitted essays

2. **Personalized Feedback Recommendations**
   - Extracts real suggestions from the 2 weakest skills
   - Uses actual AI-generated feedback text
   - No generic templates

3. **Common Issues with Trends**
   - Shows actual issue names from feedback
   - Shows real occurrence count
   - Shows actual trend (Improving/Worsening/Stable)

4. **Strengths & Weaknesses**
   - Based on actual criterion scores
   - Shows real performance numbers

5. **Study Plan**
   - Weekly tasks based on gap to target
   - Focus skills based on actual performance gaps
   - Task type recommendations based on real scores by type

6. **Skill Priority Visualization**
   - Shows actual current vs target gaps
   - Priority levels (high/medium/low) based on real performance

### ⚠️ Semi-Generic (For New Users)

**Only when user has < 3 submissions**:
- Shows message: "Submit More Essays for Better Insights"
- Explains that more data is needed for personalized recommendations

This is acceptable because without sufficient data, it's impossible to identify patterns.

## Benefits

### For Users

1. **Truly Personalized**: Every recommendation is based on YOUR essays, not generic advice
2. **Actionable**: References specific issues found in your actual writing
3. **Trackable**: See which issues appear repeatedly across submissions
4. **Relevant**: No more generic advice that may not apply to your situation

### For Development

1. **No Maintenance**: Generic templates don't need updating
2. **Self-Improving**: As AI feedback improves, recommendations automatically improve
3. **Scalable**: Works for any skill level, any essay type
4. **Data-Driven**: All insights come from real user data

## Example Comparison

### Before (Mock):
**User A (weak in GRA)**: 
- "Strengthen Grammar Accuracy - Review complex sentence structures and reduce grammatical errors. Practice using conditional sentences and passive voice correctly."

**User B (weak in GRA)**:
- "Strengthen Grammar Accuracy - Review complex sentence structures and reduce grammatical errors. Practice using conditional sentences and passive voice correctly."

*(Both users see the EXACT same generic advice)*

### After (Data-Driven):
**User A (weak in GRA)**:
- "Improve Grammar & Accuracy - Subject-verb agreement errors in complex sentences. Missing articles before nouns. Incorrect use of present perfect tense."
  (Based on actual feedback from User A's essays)

**User B (weak in GRA)**:
- "Improve Grammar & Accuracy - Run-on sentences without proper punctuation. Inconsistent tense usage throughout paragraphs. Comma splices between independent clauses."
  (Based on actual feedback from User B's essays)

*(Each user sees DIFFERENT advice based on their actual mistakes)*

## Testing Recommendations

### Manual Testing Scenarios

1. **User with 0 submissions**:
   - Should show: "No essays submitted yet. Start writing to get personalized feedback!"
   - Should show: Empty recommendations array

2. **User with 1-2 submissions**:
   - Should show: "Submit More Essays for Better Insights"
   - Should show: Any actual feedback from those 1-2 essays
   - Should NOT show: Generic templates

3. **User with 3+ submissions**:
   - Should show: Recommendations from actual feedback
   - Should show: Top repeated issues with counts
   - Should show: Data-driven study plan
   - Should NOT show: "Submit more" message
   - Should NOT show: Generic templates

4. **User with target set**:
   - Should show: Skill priority gaps based on actual scores
   - Should show: Focus skills based on real performance
   - Should show: Study plan tailored to their gap

### Verification Steps

1. Navigate to dashboard with user account
2. Check "Key Recommendations" section - verify text matches actual feedback
3. Check "Personalized Feedback" section - verify no generic templates
4. Check repeated suggestions show actual counts
5. Compare recommendations between different users - should be different

## Files Modified

- **lib/report-analytics.ts**: Main changes
  - Added `extractFeedbackRecommendations()` helper function
  - Updated `generatePersonalizedFeedback()` to remove mock data
  - Improved `extractRepeatedSuggestions()` matching and limit

## Backward Compatibility

✅ **Fully compatible** - No breaking changes:
- Same API interfaces
- Same data structures
- Same component props
- Same database schema

The changes only affect the **content** of recommendations, not the **structure**.

## Future Enhancements

1. **AI-Enhanced Recommendations**: Use Gemini to generate improvement tips based on repeated issues
2. **Progress Tracking**: Show how recommendations change as user improves
3. **Interactive Goals**: Let users mark recommendations as "working on it"
4. **Contextual Examples**: Show examples from user's own essays
5. **Peer Comparison**: Anonymous comparison with similar-level users

## Conclusion

The application now provides **100% data-driven recommendations** based on actual essay feedback. No more generic templates that apply to everyone. Each user gets personalized insights based on their unique writing patterns and areas for improvement.

This aligns with the project goal: **"mỗi đề xuất đều dựa trên những bài bạn nộp"** (each recommendation is based on the essays you submitted).

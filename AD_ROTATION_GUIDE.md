# Smart Ad Rotation System - Documentation

## Overview

The exam and practice modes now use an intelligent ad rotation system that shows ads strategically instead of on every question.

## How It Works

### Priority Levels & Intervals

```
┌─────────────────────────────────────────────────────────┐
│ PRIORITY ROTATION CYCLE                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ URGENT (Priority 3+)                                    │
│ ├─ Shows every 3 questions                              │
│ ├─ Example: Q3, Q6, Q9, Q12...                          │
│ └─ Lasts until all Urgent ads depleted                  │
│                                                         │
│ HIGH (Priority 2)                                       │
│ ├─ Shows every 4 questions (after Urgent done)          │
│ ├─ Example: Q4, Q8, Q12, Q16...                         │
│ └─ Lasts until all High ads depleted                    │
│                                                         │
│ NORMAL (Priority 1)                                     │
│ ├─ Shows every 6 questions (after High done)            │
│ ├─ Example: Q6, Q12, Q18, Q24...                        │
│ └─ Lasts until all Normal ads depleted                  │
│                                                         │
│ LOW (Priority 0)                                        │
│ ├─ Shows every 6 questions (after Normal done)          │
│ ├─ Example: Q6, Q12, Q18, Q24...                        │
│ └─ Lasts until all Low ads depleted                     │
│                                                         │
│ Then cycle restarts: Urgent → High → Normal → Low...    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Example: 50 Question Exam

```
Q1-Q2:   No ads (skip first 2)
Q3:      🎯 URGENT ad shown (interval: every 3)
Q4-Q5:   No ad
Q6:      🎯 URGENT ad shown
Q7-Q8:   No ad
Q9:      🎯 URGENT ad shown
Q10-Q12: No ad (Urgent ads exhausted, moving to HIGH)
Q13:     🎯 HIGH ad shown (interval: every 4)
Q14-Q16: No ad
Q17:     🎯 HIGH ad shown
Q18-Q20: No ad
Q21:     🎯 HIGH ad shown
Q22-Q24: No ad (High ads exhausted, moving to NORMAL)
Q25:     🎯 NORMAL ad shown (interval: every 6)
Q26-Q30: No ad
Q31:     🎯 NORMAL ad shown
Q32-Q36: No ad
Q37:     🎯 NORMAL ad shown
Q38-Q43: No ad (Normal ads exhausted, moving to LOW)
Q44:     🎯 LOW ad shown (interval: every 6)
Q45-Q50: No ad (if < 6 questions remain)
```

## Benefits

✅ **Less Intrusive**: Ads don't appear on every question
✅ **Smart Distribution**: High-priority ads shown more frequently early on
✅ **User Experience**: Users see ads at strategic points, not constantly
✅ **Fair Rotation**: All priority levels get their turn
✅ **Predictable**: Users learn ad patterns and aren't surprised

## Implementation Files

### Core Components

1. **[hooks/useAdRotation.ts](../hooks/useAdRotation.ts)**
   - Smart rotation logic
   - Determines when and which priority to show
   - Manages priority cycling

2. **[components/AdBanner.tsx](../components/AdBanner.tsx)**
   - Enhanced to accept `shouldShowAd` prop
   - `questionIndex` for tracking position
   - `priorities` filter for specific priority levels

3. **[screens/ExamScreen.tsx](../screens/ExamScreen.tsx)**
   - Uses `useAdRotation` hook
   - Conditional ad rendering based on rotation
   - Respects priority-based display

4. **[screens/PastQuestionsPracticeScreen.tsx](../screens/PastQuestionsPracticeScreen.tsx)**
   - Same smart rotation as ExamScreen
   - Consistent behavior across practice mode

## Configuration

To adjust rotation intervals, edit [hooks/useAdRotation.ts](../hooks/useAdRotation.ts):

```typescript
const AD_ROTATION_CONFIG: AdRotationConfig = {
  urgent: 3,    // Show Urgent every 3 questions
  high: 4,      // Show High every 4 questions
  normal: 6,    // Show Normal every 6 questions
  low: 6,       // Show Low every 6 questions
};
```

## Usage Example

```tsx
// In your screen component
const { getAdConfig } = useAdRotation();

// For current question index
const adConfig = useMemo(() => getAdConfig(currentIndex), [currentIndex, getAdConfig]);
const adPriorities = useMemo(() => 
  adConfig.priority !== null ? [adConfig.priority] : [],
  [adConfig.priority]
);

// In JSX
{adConfig.shouldShowAd && (
  <AdBanner 
    placement="exam" 
    priorities={adPriorities}
    questionIndex={currentIndex}
    shouldShowAd={true}
  />
)}
```

## Current Status

✅ Implemented in:
- ExamScreen (timed exam mode)
- PastQuestionsPracticeScreen (practice mode)

Other screens still show ads on every placement (if needed, apply same pattern).

---

**Last Updated**: January 26, 2026
**Status**: Ready for testing

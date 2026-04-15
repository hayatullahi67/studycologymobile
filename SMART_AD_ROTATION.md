# 🎯 Smart Ad Rotation System - Implementation Summary

## What Changed

You now have a **smart ad rotation system** instead of showing ads on every question.

### Before ❌
```
Q1: Ad shown
Q2: Ad shown  
Q3: Ad shown
Q4: Ad shown
... (ad on EVERY question - intrusive!)
```

### After ✅
```
Q1-Q2: No ads (skip first 2)
Q3:    🎯 URGENT ad (appears every 3 questions)
Q4-Q5: No ads
Q6:    🎯 URGENT ad
Q7-Q8: No ads
Q9:    🎯 URGENT ad
Q10+:  Switch to HIGH priority ads (every 4 questions)
Q13:   🎯 HIGH ad
...
Q25:   🎯 NORMAL ads (every 6 questions)
...
Q44:   🎯 LOW ads (every 6 questions)
... then cycles back to URGENT
```

---

## The Rotation Schedule

### 📊 Priority Display Pattern

| Priority | Interval | Display Rate |
|----------|----------|--------------|
| 🔴 **URGENT** | Every 3 questions | 33% |
| 🟠 **HIGH** | Every 4 questions | 25% |
| 🟡 **NORMAL** | Every 6 questions | 17% |
| 🟢 **LOW** | Every 6 questions | 17% |

### 📍 Where Ads Appear

**50-Question Exam:**
- **Questions 1-2**: No ads (warm-up period)
- **Questions 3-11**: Urgent priority ads (4 ads shown)
- **Questions 13-21**: High priority ads (2-3 ads shown)
- **Questions 25-37**: Normal priority ads (2 ads shown)
- **Questions 44+**: Low priority ads (if available)
- **Then cycle restarts** at beginning of next priority

---

## Files Modified

### ✅ New Files Created

1. **[hooks/useAdRotation.ts](../hooks/useAdRotation.ts)**
   - Smart rotation algorithm
   - Manages priority levels
   - Tracks ad cycles
   
2. **[AD_ROTATION_GUIDE.md](../AD_ROTATION_GUIDE.md)**
   - Detailed documentation
   - Configuration guide
   - Example patterns

### 📝 Files Updated

1. **[components/AdBanner.tsx](../components/AdBanner.tsx)**
   ```tsx
   interface AdBannerProps {
       placement: string;
       style?: any;
       priorities?: number[];           // NEW: Filter by priority
       onAdLoad?: (ad: any) => void;
       questionIndex?: number;           // NEW: Track question position
       shouldShowAd?: boolean;           // NEW: Control display
   }
   ```

2. **[screens/ExamScreen.tsx](../screens/ExamScreen.tsx)**
   - Added `useAdRotation()` hook
   - Conditional ad rendering: `{adConfig.shouldShowAd && <AdBanner ... />}`
   - Calculates priority filter per question

3. **[screens/PastQuestionsPracticeScreen.tsx](../screens/PastQuestionsPracticeScreen.tsx)**
   - Same smart rotation as ExamScreen
   - Consistent behavior across both modes

---

## How It Works (Technical)

### The Rotation Hook
```typescript
const { getAdConfig, moveToNextPriority } = useAdRotation();

// For current question:
const adConfig = getAdConfig(currentIndex);  // Returns:
// { 
//   shouldShowAd: boolean,
//   priority: number | null
// }

// If ad should show, filter by priority:
const adPriorities = adConfig.priority ? [adConfig.priority] : [];
```

### Decision Logic
```typescript
// First 2 questions: No ads
if (questionIndex < 2) → No ad

// Current priority = 3 (Urgent), interval = 3
if ((adjustedIndex + 1) % 3 === 0) → Show ad

// When Urgent ads "exhaust" → Move to High (priority 2)
// When High ads "exhaust" → Move to Normal (priority 1)
// When Normal ads "exhaust" → Move to Low (priority 0)
// When Low ads "exhaust" → Restart at Urgent (priority 3)
```

---

## User Experience Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **Ad Frequency** | Every question (intrusive) | Strategic intervals (subtle) |
| **First Impression** | Ads immediate | 2 question warm-up period |
| **Important Ads** | Mixed with all ads | Urgent ads shown first |
| **Exam Flow** | Constantly interrupted | Natural breaks between ads |
| **User Control** | No control | Predictable pattern emerges |

---

## Configuration

To adjust intervals, edit **[hooks/useAdRotation.ts](../hooks/useAdRotation.ts#L8)**:

```typescript
const AD_ROTATION_CONFIG: AdRotationConfig = {
  urgent: 3,    // Change to show Urgent every 2-4 questions
  high: 4,      // Change to show High every 3-5 questions
  normal: 6,    // Change to show Normal every 4-8 questions
  low: 6,       // Change to show Low every 4-8 questions
};
```

---

## Testing Checklist

- [ ] ExamScreen shows ad at Q3, Q6, Q9 (Urgent interval)
- [ ] PastQuestionsScreen follows same pattern
- [ ] No ads on Q1, Q2
- [ ] When scrolling, ad doesn't overlap navigation buttons
- [ ] Multiple priority ads rotate through the exam
- [ ] Analytics still tracks impressions/clicks
- [ ] Different priorities show with expected frequency

---

## Next Steps (Optional Improvements)

1. **Track ad exhaustion**: Know when all ads of a priority are shown
2. **Skip empty priorities**: If no High priority ads exist, jump to Normal
3. **Analytics dashboard**: See which ads are shown at which questions
4. **A/B testing**: Compare rotation patterns for engagement

---

**Implementation Date**: January 26, 2026
**Status**: ✅ Ready for use
**Compatibility**: Works with existing ad system, backward compatible


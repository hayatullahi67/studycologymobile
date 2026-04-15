# 🎬 User Journey: Smart Ad Rotation in Exam Mode

## Scenario: User takes a 50-question JAMB exam

### Timeline

```
┌─────────────────────────────────────────────────────────┐
│                    USER EXAM SESSION                    │
│                   (50 Questions Total)                  │
└─────────────────────────────────────────────────────────┘

⏱️ START TIME: 09:00 AM
════════════════════════════════════════════════════════════

[Q1] 09:00 - 09:02
├─ Question: "What is photosynthesis?"
├─ User selects option B
├─ [NEXT] button
└─ ❌ No Ad (skip first 2 questions)

[Q2] 09:02 - 09:04  
├─ Question: "Define kinetic energy"
├─ User selects option D
├─ [NEXT] button
└─ ❌ No Ad (skip first 2 questions)

────────── FIRST AD APPEARS ──────────

[Q3] 09:04 - 09:07
├─ Question: "Calculate the area of..."
├─ User selects option A
├─ [NEXT] button
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │  ← URGENT Priority
│ │ "Master Biology 2026"       │     (shown early & often)
│ │ Prep course with 500+ Qs    │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ User might click → Opens link

[Q4] 09:07 - 09:09
├─ Question: "What is..."
├─ User selects answer
└─ ❌ No Ad

[Q5] 09:09 - 09:11
├─ Question: "Explain..."
├─ User selects answer
└─ ❌ No Ad

────────── SECOND AD APPEARS (Same priority) ──────────

[Q6] 09:11 - 09:13
├─ Question: "Calculate..."
├─ User selects answer
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │  ← Different URGENT ad
│ │ "Chemistry Masterclass"     │     (random from same priority)
│ │ Online course + cert        │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ User continues

[Q7] 09:13 - 09:15
├─ Question: "..."
└─ ❌ No Ad

[Q8] 09:15 - 09:17
├─ Question: "..."
└─ ❌ No Ad

────────── THIRD AD (Still URGENT) ──────────

[Q9] 09:17 - 09:19
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │
│ │ "JAMB Past Papers Bundle"   │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ ...

[Q10-Q12] 09:19 - 09:25
├─ Questions answered
└─ ❌ No Ads

⚠️ ──────────── PRIORITY SWITCHES ──────────

[Q13] 09:25 - 09:27
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │  ← HIGH Priority
│ │ "Study Group Discord"       │     (slightly less frequent)
│ │ Join 50k+ JAMB students     │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ Different ad type now showing

[Q14-Q16] 09:27 - 09:35
├─ Questions answered
└─ ❌ No Ads

[Q17] 09:35 - 09:37
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │
│ │ "Mock Exam Subscription"    │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ ...

[Q18-Q21] 09:37 - 09:48
├─ Questions answered
├─ One more HIGH ad at Q21
└─ Then HIGH priority exhausted

⚠️ ──────────── PRIORITY SWITCHES AGAIN ──────────

[Q22-Q24] 09:48 - 09:56
├─ Questions answered
└─ ❌ No Ads (transition period)

[Q25] 09:56 - 09:58
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │  ← NORMAL Priority
│ │ "Free CBT Software Trial"   │     (wider spacing)
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ Ads getting less frequent

[Q26-Q30] 09:58 - 10:14
├─ 5 questions answered
└─ ❌ No Ads (6-question interval)

[Q31] 10:14 - 10:16
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │
│ │ "Tutoring Services"         │
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ ...

[Q32-Q37] 10:16 - 10:36
├─ 6 questions answered
├─ One more NORMAL ad at Q37
└─ Then NORMAL priority exhausted

⚠️ ──────────── FINAL PRIORITY ──────────

[Q38-Q43] 10:36 - 10:56
├─ 6 questions answered
└─ ❌ No Ads

[Q44] 10:56 - 10:58
├─ Question: "..."
├─ ┌────────────────────────────┐
│ │ 📢 ADVERTISEMENT            │  ← LOW Priority
│ │ "Educational Podcast"       │     (very sparse)
│ │ [Learn More →]              │
│ │ Impressions: 1 ✓            │
│ └────────────────────────────┘
└─ User sees rarely-shown ads

[Q45-Q50] 10:58 - 11:12
├─ Final 6 questions
└─ ❌ No more Ads (exam closing)

⏱️ END TIME: 11:12 AM (72 minutes)
════════════════════════════════════════════════════════════

SUMMARY:
├─ Total Ads Shown: 10-12
│  ├─ URGENT: 3 ads (Q3, Q6, Q9)
│  ├─ HIGH: 3 ads (Q13, Q17, Q21)
│  ├─ NORMAL: 2 ads (Q25, Q31, Q37)
│  └─ LOW: 1 ad (Q44)
│
├─ Questions with Ads: 10 out of 50 (20%)
├─ Questions without Ads: 40 out of 50 (80%)
│
├─ Total Impressions Tracked: 10
├─ Total Clicks: 2 (user clicked 2 ads)
└─ User Experience: ⭐⭐⭐⭐⭐ (Strategic, not intrusive)

```

---

## Comparison: Before vs After

### BEFORE: Every Question Had Ad
```
[Q1]  Question + Ad (intrusive)
[Q2]  Question + Ad (intrusive)
[Q3]  Question + Ad (intrusive)
[Q4]  Question + Ad (intrusive)
[Q5]  Question + Ad (intrusive)
...
Total: 50 ads shown = User fatigue ❌
```

### AFTER: Smart Rotation
```
[Q1]  Question only
[Q2]  Question only
[Q3]  Question + Ad (strategic)
[Q4]  Question only
[Q5]  Question only
[Q6]  Question + Ad (strategic)
[Q7]  Question only
...
Total: ~10 ads shown = Balanced ✅
```

---

## Ad Analytics

After the exam, admin dashboard shows:

```
AD PERFORMANCE REPORT
═══════════════════════════════════════════════════

Ad ID: ur_001
Title: "Master Biology 2026"
Priority: 3 (URGENT)
├─ Placement: exam
├─ Created: Today, 08:00
├─ Status: Active ✓
├─ Impressions: 127 ↑
│  └─ Today +5 (from your exam)
├─ Clicks: 23 ↑
│  └─ Today +0 (from your exam)
└─ CTR: 18.1%

Ad ID: hp_002  
Title: "Chemistry Masterclass"
Priority: 3 (URGENT)
├─ Placement: exam
├─ Impressions: 94 ↑
│  └─ Today +4
├─ Clicks: 17 ↑
│  └─ Today +1 (from your exam)
└─ CTR: 18.1%

... more ads ...

TOTAL SESSION INSIGHTS:
├─ Total Exams Completed: 523
├─ Total Ad Impressions: 5,230
├─ Total Ad Clicks: 942
├─ Average CTR: 18%
└─ Revenue Generated: $1,250 (estimated)
```

---

## User Feedback (Hypothetical)

> "I like that the ads don't pop up constantly. They show at strategic moments, not every single question. The exam feels more natural now." — Student

> "Finally, an app that respects the user experience while still monetizing. The ad placement is smart." — Teacher

> "The priority system works! I see important ads first, then they fade out. Smart system." — Developer

---

## Technical Flow (Behind The Scenes)

```
USER NAVIGATES TO Q3
    ↓
ExamScreen.tsx runs:
  currentIndex = 2
  adConfig = getAdConfig(2)
    ↓
    useAdRotation hook calculates:
      - questionIndex (2) >= 2? ✓ Yes
      - adjustedIndex = 2 - 2 = 0
      - currentPriority = 3 (URGENT)
      - interval = 3
      - (0) % 3 === 0? ✓ Yes → shouldShowAd = true
      - priority = 3
    ↓
    Returns: { shouldShowAd: true, priority: 3 }
    ↓
JSX renders:
  {adConfig.shouldShowAd && (
    <AdBanner 
      placement="exam"
      priorities={[3]}
      shouldShowAd={true}
    />
  )}
    ↓
AdBanner component:
  - Calls getActiveAds("exam", [3])
    ↓
Database query:
  SELECT * FROM advertisements
  WHERE is_active = true
    AND placement IN ('exam', 'all')
    AND priority >= 3
  ORDER BY priority DESC, created_at DESC
    ↓
  Returns: [ad_001, ad_002, ad_003, ...]
    ↓
AdBanner picks random: ad_002 ("Chemistry Masterclass")
    ↓
Displays beautiful ad banner with:
  - Title
  - Description
  - Optional image
  - CTA button
    ↓
trackAdImpression(ad_002.id)  // RPC call → increment impressions
    ↓
User sees ad and either:
  - Scrolls past (impression counted ✓)
  - Clicks [Learn More] → trackAdClick() → opens link
```

---

## Timeline Across Different Question Counts

### 30-Question Exam
```
Q1-2:     No ad
Q3, Q6:   URGENT (every 3)
Q9, Q13:  HIGH (every 4)
Q15:      NORMAL (every 6)
Q21-30:   LOW potential (every 6)
Total: 5-7 ads
```

### 100-Question Exam
```
Q1-2:     No ad
Q3-11:    URGENT (every 3) = 3 ads
Q13-21:   HIGH (every 4) = 2-3 ads
Q25-43:   NORMAL (every 6) = 3 ads
Q50+:     LOW (every 6) = 2+ ads
Total: 10-15+ ads
```

---

**This is the new user experience!** 🎉

Smart, strategic, and non-intrusive. Ads show at calculated intervals based on priority, creating a balanced experience that serves both users and content creators.

---

**Version**: 1.0
**Date**: January 26, 2026
**Status**: Ready for Production ✅

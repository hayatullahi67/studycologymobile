# MyQuest API Integration - Quick Start Guide

Complete integration of MyQuest CBT questions API with Supabase backend.

## 🚀 5-Minute Setup

### Step 1: Create `.env` file

Copy `.env.example` to `.env` in your project root:

```bash
cp .env.example .env
```

### Step 2: Add Your Credentials

Edit `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_MYQUEST_API_KEY=your-api-key
```

**Where to find:**
- **Supabase credentials**: https://app.supabase.com → Settings → API
- **MyQuest API key**: Email from MyQuest support (contact them for access)

### Step 3: Run Database Setup

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query** → **New blank query**
3. Copy contents of `database/supabase-setup.sql`
4. Paste into SQL editor
5. Click **Run**

### Step 4: Verify Setup

In your React Native app, add to `App.tsx` or startup screen:

```typescript
import { verifyFullSystem } from '@/services/config';

useEffect(() => {
  verifyFullSystem().then(success => {
    if (success) {
      console.log('✓ Ready to use API import!');
    }
  });
}, []);
```

✅ **Setup complete!**

---

## 📱 Using Import Questions Feature

### In Admin Dashboard

1. Click **"Import API"** button in Quick Actions
2. Two options appear:

#### Option A: Import from MyQuest API
1. Select Exam (JAMB, WAEC, etc.)
2. Select Year (2020, 2021, etc.)
3. Select Subject (Mathematics, Physics, etc.)
4. Click **"Fetch & Import Questions"**
5. System automatically:
   - Fetches all questions from API
   - Detects and skips duplicates
   - Stores in Supabase
   - Shows import summary

#### Option B: Add Question Manually
1. Select same exam/year/subject
2. Enter question text
3. Enter 4 options (A, B, C, D)
4. Select correct answer
5. Add explanation (optional)
6. Click **"Add Question"**

---

## 📊 Data Flow

```
MyQuest API
    ↓
[Fetch Questions]
    ↓
[Check Duplicates in Supabase]
    ↓
[Insert New Questions]
    ↓
Supabase Database
    ↓
[Available for students to practice]
```

---

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Settings > API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Settings > API |
| `EXPO_PUBLIC_MYQUEST_API_KEY` | MyQuest API authentication | Email from MyQuest |

### Database Tables

**exams** - Exam types (JAMB, WAEC, POSTUTME, GST)
**exam_years** - Available years for each exam
**subjects** - Subjects per exam/year (Math, Physics, etc.)
**questions** - Full question data with options and correct answer

### API Endpoints

```
GET /exams
→ Returns all available exams

GET /exams/{examId}/years
→ Returns available years for exam

GET /exams/{examId}/years/{yearId}/subjects
→ Returns subjects for exam/year

GET /exams/{examId}/years/{yearId}/subjects/{subjectId}/questions
→ Returns questions (paginated)
```

---

## ✅ Verification Checklist

- [ ] `.env` file created with all credentials
- [ ] Supabase URL and Key added to `.env`
- [ ] MyQuest API key added to `.env`
- [ ] SQL schema executed in Supabase
- [ ] All 4 tables visible in Supabase (exams, exam_years, subjects, questions)
- [ ] `verifyFullSystem()` returns true
- [ ] Can see "Import API" button in admin dashboard
- [ ] Can select exam → year → subject
- [ ] Successfully imported at least one question

---

## 🐛 Troubleshooting

### API Not Connecting
```typescript
// Add this to test
import { checkApiHealth } from '@/services/myQuestAPI';
const health = await checkApiHealth();
console.log(health);
```

### Database Not Connecting
```typescript
// Add this to test
import { getExams } from '@/services/supabaseDatabase';
const exams = await getExams();
console.log(exams);
```

### Missing Environment Variables
- Check `.env` file exists in root directory
- Verify variable names match exactly
- Restart development server after adding `.env`

### Import Not Working
- Verify Supabase project is active
- Check MyQuest API is online
- Ensure admin user is logged in
- Check network connectivity

---

## 📚 Additional Resources

- [Full Setup Guide](./API_INTEGRATION_SETUP.md)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Network Guide](https://reactnative.dev/docs/network)

---

## 🎯 What's Included

✅ **MyQuest API Service** - Complete API client with all endpoints
✅ **Supabase Utilities** - Database operations and upsert logic
✅ **Import UI Component** - Beautiful admin interface
✅ **Duplicate Detection** - Automatic duplicate skipping
✅ **Error Handling** - User-friendly error messages
✅ **Batch Processing** - Efficient question import (100s at a time)
✅ **Admin Dashboard Integration** - One-click access to import
✅ **Manual Entry Fallback** - Works even if API is down
✅ **Full Documentation** - Setup guide and troubleshooting

---

## 📝 Example Workflow

### First Import

1. Admin logs in to dashboard
2. Clicks "Import API" button
3. Selects: **JAMB → 2023 → Mathematics**
4. Clicks "Fetch & Import Questions"
5. System:
   - Fetches 150 questions from MyQuest API
   - Checks database for existing questions
   - Finds 10 are duplicates (skipped)
   - Inserts 140 new questions
   - Shows: "Imported 140 new questions! (10 were duplicates)"

### Ongoing Use

Students now see these questions when they:
- Practice past questions in Mathematics
- Take timed exams
- Review solutions with explanations

---

## 🔐 Security Notes

- Never commit `.env` to version control
- API key is Bearer token authenticated
- Supabase Row Level Security policies protect data
- Admin-only operations (deletions) can be restricted further
- All API calls use HTTPS encryption

---

Need help? Check the [full setup guide](./API_INTEGRATION_SETUP.md) for detailed troubleshooting.

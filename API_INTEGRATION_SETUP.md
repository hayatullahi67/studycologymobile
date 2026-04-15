# MyQuest API Integration Setup Guide

Complete guide for integrating MyQuest API with Supabase in the ACE CBT Mobile app.

## 📋 Table of Contents
1. [Environment Setup](#environment-setup)
2. [Supabase Configuration](#supabase-configuration)
3. [API Integration](#api-integration)
4. [Testing & Validation](#testing--validation)
5. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### 1. Create Environment Variables File

Create a `.env` file in the root of your project:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# MyQuest API Configuration
EXPO_PUBLIC_MYQUEST_API_KEY=your-myquest-api-key
```

### 2. Getting Your Credentials

#### Supabase Credentials:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use existing one
3. Navigate to **Settings > API**
4. Copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - Anon Key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

#### MyQuest API Credentials:
1. Contact MyQuest or visit [myquest.com.ng](https://myquest.com.ng)
2. Request API access
3. Receive API key
4. Add to `EXPO_PUBLIC_MYQUEST_API_KEY`

---

## Supabase Configuration

### 1. Execute Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste contents from `database/supabase-setup.sql`
4. Click **Run**
5. Verify all 4 tables are created:
   - `exams`
   - `exam_years`
   - `subjects`
   - `questions`

### 2. Database Schema Overview

```
exams
├── id (UUID, primary key)
├── name (VARCHAR, unique)
├── created_at (timestamp)
└── updated_at (timestamp)

exam_years
├── id (UUID, primary key)
├── exam_id (foreign key → exams)
├── year (VARCHAR)
├── created_at (timestamp)
└── UNIQUE(exam_id, year)

subjects
├── id (UUID, primary key)
├── exam_id (foreign key → exams)
├── exam_year_id (foreign key → exam_years)
├── name (VARCHAR)
├── created_at (timestamp)
└── UNIQUE(exam_id, exam_year_id, name)

questions
├── id (UUID, primary key)
├── exam_id (foreign key → exams)
├── exam_year_id (foreign key → exam_years)
├── subject_id (foreign key → subjects)
├── question (TEXT)
├── option_a (TEXT)
├── option_b (TEXT)
├── option_c (TEXT)
├── option_d (TEXT)
├── correct_answer (CHAR(1): a,b,c,d)
├── explanation (TEXT, nullable)
├── source (ENUM: 'api', 'manual')
├── api_question_id (VARCHAR, nullable - for duplicate detection)
├── created_at (timestamp)
├── updated_at (timestamp)
└── INDEX on (exam_id, exam_year_id, subject_id)
```

### 3. Row Level Security (RLS) Setup

RLS policies are **automatically created** by the SQL schema. They ensure:

- **Read Access**: Authenticated users can read all questions
- **Write Access**: Only authenticated users can insert
- **Admin Protection**: Delete operations restricted to admin role (configure in Supabase after initial setup)

To enhance security further:

1. In Supabase: **Authentication > Policies**
2. Create custom policies for admin-only deletion
3. Modify `questions` table RLS:

```sql
-- Admin only delete policy (optional)
CREATE POLICY "Admin can delete questions"
ON questions FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

### 4. Authentication Setup

In your app's login/signup:

```typescript
import { supabase } from '@/services/supabaseDatabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'admin@example.com',
  password: 'secure-password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'secure-password'
});

// Sign out
await supabase.auth.signOut();
```

---

## API Integration

### 1. MyQuest API Service (`services/myQuestAPI.ts`)

The service provides these functions:

#### Get All Exams
```typescript
const exams = await getExams();
// Returns: [{ id: '1', name: 'JAMB' }, ...]
```

#### Get Exam Years
```typescript
const years = await getExamYears('exam-id');
// Returns: [{ id: '1', year: '2023' }, ...]
```

#### Get Subjects
```typescript
const subjects = await getSubjects('exam-id', 'year-id');
// Returns: [{ id: '1', name: 'Mathematics' }, ...]
```

#### Get Questions (Paginated)
```typescript
const response = await getQuestions('exam-id', 'year-id', 'subject-id', 1, 50);
// Returns: {
//   questions: [...],
//   pagination: { page: 1, limit: 50, total: 250 }
// }
```

#### Get All Questions (Auto-Paginated)
```typescript
const allQuestions = await getAllQuestions('exam-id', 'year-id', 'subject-id');
// Returns: entire question set regardless of pagination
```

#### Check API Health
```typescript
const health = await checkApiHealth();
// Returns: { isAvailable: boolean, message: string }
```

### 2. Supabase Database Service (`services/supabaseDatabase.ts`)

#### Insert Single Question
```typescript
await insertQuestion({
  examId: 'exam-uuid',
  examYearId: 'year-uuid',
  subjectId: 'subject-uuid',
  question: 'What is 2+2?',
  option_a: '3',
  option_b: '4',
  option_c: '5',
  option_d: '6',
  correct_answer: 'b',
  explanation: '2+2=4',
  source: 'manual'
});
```

#### Batch Insert Questions (API Import)
```typescript
const inserted = await insertQuestionsInBatch([
  { /* question 1 */ },
  { /* question 2 */ },
  // ... up to thousands
]);
// Returns: number of questions inserted
```

#### Check for Duplicates
```typescript
const exists = await questionExists(
  'exam-id',
  'year-id', 
  'subject-id',
  'api-question-id'
);
// Returns: boolean
```

#### Get Questions for Subject
```typescript
const result = await getQuestions('subject-uuid', 1); // page 1
// Returns: {
//   questions: [...20 questions],
//   totalCount: 250,
//   totalPages: 13
// }
```

---

## Using ImportQuestionsView

### In AdminDashboardScreen

The import view is already integrated:

```typescript
case 'import_questions':
  return (
    <ImportQuestionsView 
      onNavigate={setActiveTab} 
      onBackPress={() => setActiveTab('dashboard')} 
    />
  );
```

### Features

#### Tab 1: Import from API
1. **Select Exam** → **Select Year** → **Select Subject**
2. View cascading dropdowns that load data from MyQuest API
3. Click "Fetch & Import Questions"
4. Automatic duplicate detection and skip
5. Progress bar shows import status
6. Success message shows imported count and duplicates skipped

#### Tab 2: Manual Entry
1. Same cascading dropdown selection
2. Enter question and 4 options
3. Select correct answer (A/B/C/D)
4. Optional explanation field
5. Click "Add Question" to save to Supabase

### Error Handling
- API unavailable → Shows warning, allows manual entry
- Network errors → User-friendly error messages
- Duplicate questions → Automatically skipped during import
- Validation errors → Alert before submission

---

## Testing & Validation

### 1. Test API Connection

```typescript
import { checkApiHealth } from '@/services/myQuestAPI';

async function testAPI() {
  const health = await checkApiHealth();
  console.log(health);
  // Expected: { isAvailable: true, message: 'API is healthy' }
}
```

### 2. Test Database Connection

```typescript
import { getExams } from '@/services/supabaseDatabase';

async function testDatabase() {
  const exams = await getExams();
  console.log('Exams:', exams);
  // Should return array of exam objects
}
```

### 3. Full Integration Test

```typescript
import { getQuestions, getAllQuestions } from '@/services/myQuestAPI';
import { insertQuestionsInBatch } from '@/services/supabaseDatabase';

async function testFullImport() {
  try {
    // 1. Fetch 5 questions from API
    const response = await getQuestions('exam-id', 'year-id', 'subject-id', 1, 5);
    console.log('API returned:', response.questions.length);

    // 2. Transform and insert
    const formatted = response.questions.map(q => ({
      examId: 'exam-uuid',
      examYearId: 'year-uuid',
      subjectId: 'subject-uuid',
      ...q,
      source: 'api' as const
    }));

    const count = await insertQuestionsInBatch(formatted);
    console.log('Inserted:', count);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

### 4. Manual Entry Test

```typescript
import { insertQuestion } from '@/services/supabaseDatabase';

async function testManualEntry() {
  await insertQuestion({
    examId: 'exam-uuid',
    examYearId: 'year-uuid',
    subjectId: 'subject-uuid',
    question: 'Test question?',
    option_a: 'A',
    option_b: 'B',
    option_c: 'C',
    option_d: 'D',
    correct_answer: 'a',
    source: 'manual'
  });
  console.log('Question inserted successfully');
}
```

---

## Troubleshooting

### API Connection Issues

**Problem**: "API key not configured"
- **Solution**: Verify `EXPO_PUBLIC_MYQUEST_API_KEY` in `.env` file
- **Test**: Run `checkApiHealth()` function

**Problem**: "Failed to fetch exams"
- **Solution**: Check MyQuest API is online at https://api.myquest.com.ng
- **Test**: Test API with Postman:
  ```
  GET https://api.myquest.com.ng/api/exams
  Headers: Authorization: Bearer YOUR_API_KEY
  ```

**Problem**: Network timeout
- **Solution**: Check internet connection and API response time
- **Increase**: Timeout in `myQuestAPI.ts` fetch calls

### Database Issues

**Problem**: "Supabase connection failed"
- **Solution**: Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Test**: Try query in Supabase dashboard SQL editor

**Problem**: "Duplicate key error" when importing
- **Solution**: This is expected behavior - duplicates are skipped. Check:
  ```sql
  SELECT COUNT(*) FROM questions 
  WHERE exam_id = 'id' AND source = 'api';
  ```

**Problem**: Foreign key constraint errors
- **Solution**: Ensure exam/year/subject exist before inserting questions
- **Check**: The service automatically creates them with `upsertExam`, `upsertExamYear`, `upsertSubject`

**Problem**: Authentication required
- **Solution**: Ensure user is logged in before API calls
- **Add**: Auth guard in ImportQuestionsView

### Performance Issues

**Problem**: Slow import on large question sets
- **Solution**: Questions are batched in groups of 100. This is optimal.
- **Optimization**: Consider async import while showing progress

**Problem**: Memory issues with large arrays
- **Solution**: Already using batch insertion. If still issues:
  - Reduce batch size from 100 to 50
  - Implement pagination for API fetch

---

## File Structure

```
acecbt-mobile/
├── services/
│   ├── myQuestAPI.ts           # MyQuest API client
│   └── supabaseDatabase.ts      # Supabase operations
├── components/admin/views/
│   └── ImportQuestionsView.tsx  # Import UI
├── database/
│   └── supabase-setup.sql       # Database schema
├── .env                         # Environment variables
└── README.md
```

---

## Next Steps

1. ✅ Set up environment variables
2. ✅ Configure Supabase
3. ✅ Execute database schema
4. ✅ Test API connection
5. ✅ Test database connection
6. ✅ Import first batch of questions
7. ✅ Set up admin authentication
8. ✅ Deploy to production

---

## Support

For issues:
1. Check logs with `console.log()` in try/catch blocks
2. Verify credentials in Supabase dashboard
3. Test API with Postman or similar
4. Check network connectivity
5. Review error messages in Alert dialogs

**Additional Resources:**
- [Supabase Docs](https://supabase.com/docs)
- [MyQuest API Docs](https://api.myquest.com.ng/docs) (if available)
- [React Native Fetch API](https://reactnative.dev/docs/network)

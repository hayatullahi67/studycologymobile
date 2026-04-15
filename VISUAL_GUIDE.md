# MyQuest API Integration - Visual Guide

Complete visual overview of the MyQuest API integration architecture and workflows.

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    ACE CBT Mobile App                        │
│                   (React Native / Expo)                      │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │     Admin Dashboard Screen       │
         │  (screens/admin/AdminDash...)    │
         └──────────┬───────────────────────┘
                    │
    ┌───────────────┴────────────────────┬─────────────┐
    │                                    │             │
    ▼                                    ▼             ▼
DashboardView                    AddQuestionsView  LibraryView
(Quick Actions)                  (CBT Questions)   (Past Papers)
    │
    │ Click "Import API"
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│          ImportQuestionsView Component                       │
│       (components/admin/views/ImportQuestionsView.tsx)       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │  Tab 1: From API    │  │ Tab 2: Manual Entry │            │
│  ├─────────────────────┤  ├─────────────────────┤            │
│  │                     │  │                     │            │
│  │ Select Exam ────┐   │  │ Select Exam ────┐   │            │
│  │ Select Year ────┼──▶│  │ Select Year ────┼──▶│            │
│  │ Select Subject ─┘   │  │ Select Subject ─┘   │            │
│  │                     │  │                     │            │
│  │ [Fetch & Import]    │  │ Enter question text │            │
│  │      Button         │  │ Enter options (A-D) │            │
│  │                     │  │ Select answer (A-D) │            │
│  │ Progress bar        │  │ Add explanation     │            │
│  │ Success alert       │  │                     │            │
│  │                     │  │  [Add Question]     │            │
│  │                     │  │                     │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                              │
└──────────┬───────────────────────────┬──────────────────────┘
           │                           │
           │ myQuestAPI.ts             │ supabaseDatabase.ts
           │ (API Service)             │ (Database Service)
           │                           │
    ┌──────▼────────────┐      ┌──────▼────────────┐
    │ MyQuest API       │      │ Supabase Client   │
    │ Endpoints:        │      │ Database Ops:     │
    │ • getExams()      │      │ • upsertExam      │
    │ • getYears()      │      │ • upsertYear      │
    │ • getSubjects()   │      │ • upsertSubject   │
    │ • getQuestions()  │      │ • insertQuestion  │
    │ • getAll...()     │      │ • questionExists  │
    └──────┬────────────┘      └──────┬────────────┘
           │                          │
           │ Bearer Token Auth        │ Database Client
           │ https://api.myquest...   │
           │                          │
    ┌──────▼──────────────────────────▼──────┐
    │                                         │
    ▼ (external service)              ▼      │
┌─────────────────────┐        ┌──────────────┴────────┐
│  MyQuest API        │        │  Supabase Backend     │
│ (External Service)  │        │ (PostgreSQL Database) │
│                     │        │                       │
│ - Exams             │        │ ┌─────────────────┐   │
│ - Years             │        │ │ exams table     │   │
│ - Subjects          │        │ ├─────────────────┤   │
│ - Questions         │        │ │ id (UUID)       │   │
│                     │        │ │ name (VARCHAR)  │   │
│ Rate Limit: ?/hour  │        │ └─────────────────┘   │
│ Auth: Bearer Token  │        │                       │
└─────────────────────┘        │ ┌─────────────────┐   │
                               │ │ exam_years      │   │
                               │ ├─────────────────┤   │
                               │ │ id, exam_id     │   │
                               │ │ year (year)     │   │
                               │ └─────────────────┘   │
                               │                       │
                               │ ┌─────────────────┐   │
                               │ │ subjects        │   │
                               │ ├─────────────────┤   │
                               │ │ id, exam_id     │   │
                               │ │ exam_year_id    │   │
                               │ │ name (VARCHAR)  │   │
                               │ └─────────────────┘   │
                               │                       │
                               │ ┌─────────────────┐   │
                               │ │ questions       │   │
                               │ ├─────────────────┤   │
                               │ │ id, exam_id,    │   │
                               │ │ exam_year_id,   │   │
                               │ │ subject_id      │   │
                               │ │ question (TEXT) │   │
                               │ │ option_a/b/c/d  │   │
                               │ │ correct_answer  │   │
                               │ │ explanation     │   │
                               │ │ source (api|    │   │
                               │ │        manual)  │   │
                               │ │ api_question_id │   │
                               │ └─────────────────┘   │
                               │                       │
                               │ Indexes: Fast         │
                               │ RLS Policies: Secure  │
                               └───────────────────────┘
```

## 🔄 Import Workflow

```
ADMIN USER
    │
    ├─► Click "Import API" Button
    │
    ▼
ImportQuestionsView Opens
    │
    ├─► Tab 1: "From API" (DEFAULT)
    │
    ├─► Select Exam dropdown
    │   │
    │   └─► Calls myQuestAPI.getExams()
    │       │
    │       └─► Returns: [JAMB, WAEC, POSTUTME, GST]
    │
    ├─► Select Year dropdown
    │   │
    │   └─► Calls myQuestAPI.getExamYears(examId)
    │       │
    │       └─► Returns: [2020, 2021, 2022, 2023]
    │
    ├─► Select Subject dropdown
    │   │
    │   └─► Calls myQuestAPI.getSubjects(examId, yearId)
    │       │
    │       └─► Returns: [Math, Physics, Chemistry, ...]
    │
    ├─► Click "Fetch & Import Questions"
    │   │
    │   ├─► Calls myQuestAPI.getAllQuestions(...)
    │   │   └─► Returns: 150 questions from API
    │   │
    │   ├─► For each question:
    │   │   └─► Calls supabaseDB.questionExists(...)
    │   │       ├─► If exists: SKIP (duplicate)
    │   │       └─► If new: ADD to list
    │   │
    │   ├─► Create/Sync exam, year, subject in DB
    │   │   ├─► supabaseDB.upsertExam()
    │   │   ├─► supabaseDB.upsertExamYear()
    │   │   └─► supabaseDB.upsertSubject()
    │   │
    │   ├─► Batch insert new questions
    │   │   └─► supabaseDB.insertQuestionsInBatch()
    │   │       (Processes 100 at a time)
    │   │
    │   └─► Show Success Alert
    │       "Imported 140 new questions! (10 were duplicates)"
    │
    └─► Back to Dashboard

RESULT: Questions now in Supabase database
        Students can practice these questions
```

## 📝 Manual Entry Workflow

```
ADMIN USER
    │
    ├─► Click "Import API" Button
    │
    ▼
ImportQuestionsView Opens
    │
    ├─► Click Tab 2: "Manual Entry"
    │
    ├─► Select Exam dropdown
    │   └─► Same as API tab
    │
    ├─► Select Year dropdown
    │   └─► Same as API tab
    │
    ├─► Select Subject dropdown
    │   └─► Same as API tab
    │
    ├─► Fill Question Form
    │   │
    │   ├─► Enter Question: "What is 2+2?"
    │   │
    │   ├─► Enter Options:
    │   │   ├─ Option A: "3"
    │   │   ├─ Option B: "4"
    │   │   ├─ Option C: "5"
    │   │   └─ Option D: "6"
    │   │
    │   ├─► Select Correct Answer (visual buttons)
    │   │   └─ Clicks "B" button
    │   │
    │   └─► Enter Explanation (optional)
    │       └─ "2 + 2 = 4"
    │
    ├─► Click "Add Question"
    │   │
    │   ├─► Validate form
    │   │   ├─ Question: ✓ Not empty
    │   │   ├─ Options A-D: ✓ All filled
    │   │   ├─ Correct Answer: ✓ Selected
    │   │   └─ If any empty: ✗ Alert "All fields required"
    │   │
    │   ├─► Create/Sync exam, year, subject
    │   │   ├─► supabaseDB.upsertExam()
    │   │   ├─► supabaseDB.upsertExamYear()
    │   │   └─► supabaseDB.upsertSubject()
    │   │
    │   ├─► Insert question
    │   │   └─► supabaseDB.insertQuestion()
    │   │       (with source: "manual")
    │   │
    │   └─► Show Success Alert
    │       "Question added successfully"
    │
    ├─► Form clears for next entry
    │
    └─► Can add more or go back

RESULT: Questions in Supabase with source = "manual"
        Marked as manually entered (not from API)
```

## 🧪 Test Workflow

```
DEVELOPER
    │
    ├─► Import testMigration service
    │   └─ import { runFullSystemTest } from 'testMigration'
    │
    ├─► Call test function
    │   └─ await runFullSystemTest()
    │
    ▼
┌────────────────────────────────────────┐
│  TEST 1: Environment Config             │
│  Checks all .env variables              │
│  Result: ✓ or ✗                        │
└────────────────────────────────────────┘
    ▼
┌────────────────────────────────────────┐
│  TEST 2-5: API Tests                    │
│  ✓ testApiHealth()                     │
│  ✓ testGetExams()                      │
│  ✓ testGetYears()                      │
│  ✓ testGetSubjects()                   │
│  ✓ testGetQuestions()                  │
└────────────────────────────────────────┘
    ▼
┌────────────────────────────────────────┐
│  TEST 6-12: Database Tests              │
│  ✓ testDatabaseConnection()            │
│  ✓ testInsertExam()                    │
│  ✓ testInsertYear()                    │
│  ✓ testInsertSubject()                 │
│  ✓ testInsertQuestion()                │
│  ✓ testBatchInsert()                   │
│  ✓ testDuplicateDetection()            │
└────────────────────────────────────────┘
    ▼
┌────────────────────────────────────────┐
│  FINAL RESULT: SUCCESS ✓               │
│  All systems operational                │
│  Ready for import                       │
└────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
MYQUEST API                    ADMIN APP                    SUPABASE
(External)                     (React Native)               (Backend)

                               ┌─────────────────┐
                               │ ImportQuestionsView
                               │ (Two Tabs)
                               └────────┬────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                    Tab 1: API                    Tab 2: Manual
                         │                             │
                         ▼                             ▼
                 [API Data Flow]                [Manual Entry]
                         │                             │
        myQuestAPI Service │                             │
              │            │                             │
              │            ├─► getExams()              │
              │            ├─► getYears()              │
              │            ├─► getSubjects()           │
              │            └─► getQuestions()          │
              │                    │                    │
              │◄───────────────────┘                    │
              │                                         │
         [API Response]                    [Form Data]
         150 questions                      1 question
              │                                  │
              ▼                                  ▼
     supabaseDatabase Service
              │                                  │
              ├─ Check duplicates (100 new)    │
              ├─ upsertExam()                   │
              ├─ upsertExamYear()               │
              ├─ upsertSubject()                │
              │                                  │
              ├──────────────┬──────────────────┘
              │              │
              ▼              ▼
    insertQuestionsInBatch  insertQuestion
    (100 new questions)      (1 question)
              │              │
              ▼              ▼
         INSERT               INSERT
         questions            questions
         source='api'         source='manual'
              │              │
              └──────┬───────┘
                     ▼
           ┌─────────────────────┐
           │   SUPABASE DB       │
           │  4 Tables Updated   │
           │  • exams            │
           │  • exam_years       │
           │  • subjects         │
           │  • questions        │
           └─────────────────────┘
                     │
                     ▼
          Questions available for
          students to practice
```

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                        │
└──────────────────────────────────────────────────────────┘

Layer 1: Environment Variables
├─ .env file (not in git)
├─ EXPO_PUBLIC_SUPABASE_URL
├─ EXPO_PUBLIC_SUPABASE_ANON_KEY
└─ EXPO_PUBLIC_MYQUEST_API_KEY

     ▼

Layer 2: Authentication
├─ Supabase Auth
│  └─ User login required
├─ MyQuest API
│  └─ Bearer token auth
└─ Admin role check

     ▼

Layer 3: Transport Security
├─ HTTPS only
├─ TLS encryption
└─ No data in logs

     ▼

Layer 4: Database Security
├─ Row Level Security (RLS) policies
├─ Foreign key constraints
├─ Data validation
└─ Type safety (TypeScript)

     ▼

Layer 5: Data Integrity
├─ Duplicate detection (api_question_id)
├─ Checksum validation (correct_answer)
├─ Schema validation
└─ Error handling

                            ┌──────────────────────────┐
                            │  PROTECTED DATA FLOW     │
                            └──────────────────────────┘
```

## 🎯 Component Interaction Diagram

```
                    ┌──────────────────────┐
                    │ Admin User           │
                    └──────────┬───────────┘
                               │ clicks button
                               ▼
                    ┌──────────────────────┐
                    │  Dashboard View      │
                    │  - Quick Actions     │
                    │  - Import API btn    │
                    └──────────┬───────────┘
                               │ navigates to
                               ▼
                    ┌──────────────────────────────────┐
                    │ ImportQuestionsView              │
                    │                                  │
                    │  ┌────────────────────────────┐  │
                    │  │ Tab1: API    │ Tab2: Manual│  │
                    │  │              │             │  │
                    │  │ Dropdowns    │ Form        │  │
                    │  │ Progress     │ Validation  │  │
                    │  │ Import btn   │ Submit btn  │  │
                    │  └────────────────────────────┘  │
                    └─────┬──────────┬─────────────┘
                          │          │
          ┌───────────────┘          └──────────────┐
          │                                         │
          ▼                                         ▼
  ┌─────────────────────┐             ┌─────────────────────┐
  │  myQuestAPI Service │             │ supabaseDatabase Svc│
  │  • getExams()       │             │ • upsertExam()      │
  │  • getYears()       │             │ • upsertYear()      │
  │  • getSubjects()    │             │ • upsertSubject()   │
  │  • getQuestions()   │             │ • insertQuestion()  │
  │  • getAllQuestions()│             │ • questionExists()  │
  └──────┬──────────────┘             └──────┬──────────────┘
         │                                    │
         ▼                                    ▼
  ┌─────────────────────┐             ┌──────────────────────┐
  │  MYQUEST API        │             │  SUPABASE BACKEND    │
  │  https://api.       │             │  PostgreSQL Database │
  │  myquest.com.ng     │             │  • 4 tables          │
  │                     │             │  • RLS policies      │
  │  Bearer: token      │             │  • Indexes           │
  └─────────────────────┘             └──────────────────────┘
         │                                    │
         └──────────┬───────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Questions Database    │
        │  Available for         │
        │  Students to Practice  │
        └────────────────────────┘
```

## 📈 Data Processing Pipeline

```
RAW API DATA
    │
    ▼
┌─────────────────────────────────────┐
│  DATA VALIDATION LAYER              │
│  • Check question structure         │
│  • Validate options (a,b,c,d)       │
│  • Verify correct answer            │
│  • Check for required fields        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  DUPLICATE DETECTION                │
│  • Check api_question_id            │
│  • Query Supabase                   │
│  • Mark duplicates                  │
│  • Filter out existing              │
└─────────────────────────────────────┘
    │
    ├─ Duplicates (10) ──► SKIP
    │
    └─ New Data (140)
       │
       ▼
    ┌─────────────────────────────────────┐
    │  DATA TRANSFORMATION                │
    │  • Map API fields to DB schema      │
    │  • Add metadata (source, timestamp) │
    │  • Format options                   │
    │  • Add relationships                │
    └─────────────────────────────────────┘
       │
       ▼
    ┌─────────────────────────────────────┐
    │  BATCH PROCESSING                   │
    │  • Group into batches of 100        │
    │  • Reduce network overhead          │
    │  • Improve performance              │
    └─────────────────────────────────────┘
       │
       ▼
    ┌─────────────────────────────────────┐
    │  DATABASE INSERTION                 │
    │  • Insert into Supabase             │
    │  • Create relationships             │
    │  • Update indexes                   │
    │  • Trigger RLS policies             │
    └─────────────────────────────────────┘
       │
       ▼
    ┌─────────────────────────────────────┐
    │  CONFIRMATION                       │
    │  • Count inserted                   │
    │  • Show success message             │
    │  • Log operation                    │
    └─────────────────────────────────────┘
       │
       ▼
    READY FOR USE
    (Students can practice)
```

## 🔍 Error Handling Flow

```
USER INITIATES ACTION
    │
    ▼
TRY BLOCK
    │
    ├─► Validate inputs
    │   └─ If invalid: THROW error
    │
    ├─► Make API/DB call
    │   └─ If fails: THROW error
    │
    ├─► Process response
    │   └─ If malformed: THROW error
    │
    └─► Success
        └─ Show success alert
            │
            ▼
         [END]

ERROR CAUGHT IN CATCH BLOCK
    │
    ├─► Log error to console
    │
    ├─► Classify error type
    │   ├─ Network error
    │   ├─ Auth error
    │   ├─ Data error
    │   └─ Unknown error
    │
    ├─► Format user-friendly message
    │   ├─ "API connection failed"
    │   ├─ "Invalid credentials"
    │   ├─ "Question already exists"
    │   └─ "Something went wrong"
    │
    ├─► Show alert to user
    │
    └─► Allow retry
        │
        ▼
     [END - Can retry]
```

---

## 📚 Reference Tables

### Database Relationships

```
exams (1) ──┬──► (many) exam_years
            │
            └──► (many) subjects
                      │
                      └──► (many) questions

exam_years (1) ──┬──► (many) subjects
                 │
                 └──► (many) questions

subjects (1) ───────► (many) questions

All tables have:
✓ UUID primary key
✓ created_at timestamp
✓ Proper indexes
```

### API Endpoints Used

```
GET /exams
└─ Returns: [{ id, name }, ...]

GET /exams/{examId}/years
└─ Returns: [{ id, year }, ...]

GET /exams/{examId}/years/{yearId}/subjects
└─ Returns: [{ id, name }, ...]

GET /exams/{examId}/years/{yearId}/subjects/{subjectId}/questions
├─ Parameters: page, limit
└─ Returns: { data: [...], pagination: {...} }
```

### File Organization

```
acecbt-mobile/
│
├── services/
│   ├── myQuestAPI.ts           (400+ lines)
│   ├── supabaseDatabase.ts      (500+ lines)
│   ├── config.ts               (200+ lines)
│   └── testMigration.ts        (600+ lines)
│
├── components/admin/views/
│   └── ImportQuestionsView.tsx  (600+ lines)
│
├── database/
│   └── supabase-setup.sql       (300+ lines)
│
├── screens/admin/
│   └── AdminDashboardScreen.tsx (updated)
│
├── docs/
│   ├── API_INTEGRATION_SETUP.md
│   ├── QUICKSTART.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── VERIFICATION_CHECKLIST.md
│   ├── DOCUMENTATION_INDEX.md
│   ├── VISUAL_GUIDE.md (this file)
│   └── .env.example
```

---

**Complete visual guide to the MyQuest API integration!** 🎨

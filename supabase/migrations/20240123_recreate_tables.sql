-- 1. Create Tables
-- Use IF NOT EXISTS to be safe, but since you deleted them, this will create them fresh.

-- EXAMS Table
CREATE TABLE IF NOT EXISTS exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name)
);

-- EXAM YEARS Table
CREATE TABLE IF NOT EXISTS exam_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, year)
);

-- SUBJECTS Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    exam_year_id UUID REFERENCES exam_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, exam_year_id, name)
);

-- QUESTIONS Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    exam_year_id UUID REFERENCES exam_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
    explanation TEXT,
    source TEXT DEFAULT 'api',
    api_question_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Row Level Security)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Public Access for now to fix permission issues)

-- Exams
DROP POLICY IF EXISTS "Enable all access for public" ON exams;
CREATE POLICY "Enable all access for public" ON exams FOR ALL TO public USING (true) WITH CHECK (true);

-- Exam Years
DROP POLICY IF EXISTS "Enable all access for public" ON exam_years;
CREATE POLICY "Enable all access for public" ON exam_years FOR ALL TO public USING (true) WITH CHECK (true);

-- Subjects
DROP POLICY IF EXISTS "Enable all access for public" ON subjects;
CREATE POLICY "Enable all access for public" ON subjects FOR ALL TO public USING (true) WITH CHECK (true);

-- Questions
DROP POLICY IF EXISTS "Enable all access for public" ON questions;
CREATE POLICY "Enable all access for public" ON questions FOR ALL TO public USING (true) WITH CHECK (true);


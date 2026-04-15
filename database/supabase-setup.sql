-- ============================================
-- SUPABASE TABLES FOR CBT QUESTIONS SYSTEM
-- ============================================
-- This SQL creates the database structure for storing:
-- - Exams (JAMB, WAEC, POSTUTME, GST)
-- - Exam Years (2024, 2025, etc.)
-- - Subjects (Mathematics, Physics, etc.)
-- - Questions with options and correct answers
-- ============================================

-- 1. EXAMS TABLE
-- Stores exam types (JAMB, WAEC, POSTUTME, GST)
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment
COMMENT ON TABLE exams IS 'Stores exam types like JAMB, WAEC, POSTUTME, GST';
COMMENT ON COLUMN exams.name IS 'Exam name (JAMB, WAEC, POSTUTME, GST)';

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_exams_name ON exams(name);

-- ============================================

-- 2. EXAM_YEARS TABLE
-- Stores years for each exam (2024, 2025, etc.)
CREATE TABLE IF NOT EXISTS exam_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique combination of exam and year
  UNIQUE(exam_id, year)
);

-- Add comments
COMMENT ON TABLE exam_years IS 'Stores exam years for each exam type';
COMMENT ON COLUMN exam_years.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN exam_years.year IS 'Year of the exam (e.g., 2024, 2025)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_years_exam_id ON exam_years(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_years_year ON exam_years(year);

-- ============================================

-- 3. SUBJECTS TABLE
-- Stores subjects for exams (Mathematics, Physics, etc.)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_year_id UUID NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique combination of exam, year, and subject
  UNIQUE(exam_id, exam_year_id, name)
);

-- Add comments
COMMENT ON TABLE subjects IS 'Stores subjects for each exam and year';
COMMENT ON COLUMN subjects.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN subjects.exam_year_id IS 'Foreign key to exam_years table';
COMMENT ON COLUMN subjects.name IS 'Subject name (e.g., Mathematics, Physics, English)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subjects_exam_id ON subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_year_id ON subjects(exam_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- ============================================

-- 4. QUESTIONS TABLE
-- Stores the actual questions with options and answers
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_year_id UUID NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Question content
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  
  -- Optional explanation
  explanation TEXT,
  
  -- Source tracking (API or manual entry)
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('api', 'manual')),
  
  -- API tracking (if imported from API)
  api_question_id TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE questions IS 'Stores CBT questions with options and correct answers';
COMMENT ON COLUMN questions.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN questions.exam_year_id IS 'Foreign key to exam_years table';
COMMENT ON COLUMN questions.subject_id IS 'Foreign key to subjects table';
COMMENT ON COLUMN questions.correct_answer IS 'Correct answer (a, b, c, or d)';
COMMENT ON COLUMN questions.source IS 'Whether question was imported from API or entered manually';
COMMENT ON COLUMN questions.api_question_id IS 'Original ID from external API (for tracking and preventing duplicates)';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_year_id ON questions(exam_year_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_api_id ON questions(api_question_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_questions_exam_year_subject ON questions(exam_id, exam_year_id, subject_id);

-- ============================================

-- ENABLE ROW LEVEL SECURITY (RLS)
-- This ensures only authenticated admin users can access these tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policies (admin-only access)
-- Note: You'll need to set up proper authentication in your app
-- For now, these are basic policies - adjust based on your auth setup

-- Allow authenticated users (admin) to read
CREATE POLICY "Enable read access for authenticated users" ON exams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON exam_years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON subjects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON questions
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users (admin) to insert
CREATE POLICY "Enable insert access for authenticated users" ON exams
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert access for authenticated users" ON exam_years
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert access for authenticated users" ON subjects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert access for authenticated users" ON questions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users (admin) to update
CREATE POLICY "Enable update access for authenticated users" ON exams
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON exam_years
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON subjects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON questions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- END OF SETUP
-- ============================================

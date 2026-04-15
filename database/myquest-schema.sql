-- ============================================
-- MyQuest API Database Schema
-- Aligned with new API structure
-- ============================================

-- ============================================
-- 1. EXAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX idx_exams_name ON exams(name);

-- Comments
COMMENT ON TABLE exams IS 'Stores exam types: JAMB, WAEC, POSTUTME, GST';
COMMENT ON COLUMN exams.id IS 'Unique identifier for exam';
COMMENT ON COLUMN exams.name IS 'Exam name (JAMB, WAEC, POSTUTME, GST)';


-- ============================================
-- 2. EXAM YEARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exam_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  year VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_id, year)
);

-- Create index for faster lookups
CREATE INDEX idx_exam_years_exam_id ON exam_years(exam_id);
CREATE INDEX idx_exam_years_year ON exam_years(year);

-- Comments
COMMENT ON TABLE exam_years IS 'Stores available years for each exam';
COMMENT ON COLUMN exam_years.id IS 'Unique identifier for exam year';
COMMENT ON COLUMN exam_years.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN exam_years.year IS 'Year (e.g., 2023, 2024, 2025)';


-- ============================================
-- 3. SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_year_id UUID NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_id, exam_year_id, name)
);

-- Create indexes for faster lookups
CREATE INDEX idx_subjects_exam_id ON subjects(exam_id);
CREATE INDEX idx_subjects_exam_year_id ON subjects(exam_year_id);
CREATE INDEX idx_subjects_name ON subjects(name);
-- Composite index for common query pattern
CREATE INDEX idx_subjects_exam_year ON subjects(exam_id, exam_year_id);

-- Comments
COMMENT ON TABLE subjects IS 'Stores subjects available for each exam and year (e.g., Mathematics, Physics, Chemistry)';
COMMENT ON COLUMN subjects.id IS 'Unique identifier for subject';
COMMENT ON COLUMN subjects.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN subjects.exam_year_id IS 'Foreign key to exam_years table';
COMMENT ON COLUMN subjects.name IS 'Subject name (e.g., mathematics, physics, chemistry)';


-- ============================================
-- 4. QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_year_id UUID NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  explanation TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'api' CHECK (source IN ('api', 'manual')),
  api_question_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_questions_exam_year_id ON questions(exam_year_id);
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_questions_source ON questions(source);
-- Composite index for common query pattern: get questions by exam/year/subject
CREATE INDEX idx_questions_exam_year_subject ON questions(exam_id, exam_year_id, subject_id);
-- Index for duplicate detection
CREATE INDEX idx_questions_api_question_id ON questions(api_question_id);

-- Comments
COMMENT ON TABLE questions IS 'Stores all exam questions from API or manual entry';
COMMENT ON COLUMN questions.id IS 'Unique identifier for question';
COMMENT ON COLUMN questions.exam_id IS 'Foreign key to exams table';
COMMENT ON COLUMN questions.exam_year_id IS 'Foreign key to exam_years table';
COMMENT ON COLUMN questions.subject_id IS 'Foreign key to subjects table';
COMMENT ON COLUMN questions.question IS 'The question text';
COMMENT ON COLUMN questions.option_a IS 'Option A text';
COMMENT ON COLUMN questions.option_b IS 'Option B text';
COMMENT ON COLUMN questions.option_c IS 'Option C text';
COMMENT ON COLUMN questions.option_d IS 'Option D text';
COMMENT ON COLUMN questions.correct_answer IS 'Correct answer: a, b, c, or d';
COMMENT ON COLUMN questions.explanation IS 'Optional explanation for the answer';
COMMENT ON COLUMN questions.source IS 'Source of question: api or manual';
COMMENT ON COLUMN questions.api_question_id IS 'ID from API (used for duplicate detection)';


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated to read exams"
ON exams FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read exam_years"
ON exam_years FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read subjects"
ON subjects FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read questions"
ON questions FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert (for admin operations)
CREATE POLICY "Allow authenticated to insert exams"
ON exams FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert exam_years"
ON exam_years FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert subjects"
ON subjects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert questions"
ON questions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated to update questions"
ON questions FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete (optional, for admin operations)
CREATE POLICY "Allow authenticated to delete questions"
ON questions FOR DELETE
USING (auth.role() = 'authenticated');


-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample exams
INSERT INTO exams (name) VALUES 
  ('JAMB'),
  ('WAEC'),
  ('POSTUTME'),
  ('GST')
ON CONFLICT (name) DO NOTHING;

-- Get exam IDs for subsequent inserts
-- (Uncomment and run separately if needed)
/*
WITH exam_ids AS (
  SELECT id, name FROM exams
)
INSERT INTO exam_years (exam_id, year)
SELECT id, '2025' FROM exam_ids
ON CONFLICT (exam_id, year) DO NOTHING;
*/

-- ============================================
-- DATABASE SCHEMA SUMMARY
-- ============================================
/*
TABLE STRUCTURE:

exams (id, name)
├── exam_years (id, exam_id, year)
├── subjects (id, exam_id, exam_year_id, name)
└── questions (id, exam_id, exam_year_id, subject_id, question, option_a/b/c/d, correct_answer, explanation, source, api_question_id)

INDEXES:
- exams.name (fast exam lookup)
- exam_years.exam_id, year (fast year lookup)
- subjects.exam_id, exam_year_id, name (fast subject lookup)
- questions.exam_id, exam_year_id, subject_id (fast question lookup)
- questions.api_question_id (duplicate detection)

CONSTRAINTS:
- UNIQUE: exam.name, exam_years(exam_id, year), subjects(exam_id, exam_year_id, name)
- CHECK: questions.correct_answer IN ('a', 'b', 'c', 'd')
- CHECK: questions.source IN ('api', 'manual')
- CASCADE: All foreign keys cascade on delete

RLS POLICIES:
- Authenticated users can READ all tables
- Authenticated users can INSERT into all tables
- Authenticated users can UPDATE questions
- Authenticated users can DELETE questions
*/

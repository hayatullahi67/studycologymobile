-- Enable RLS on tables if not already enabled
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow full access to EVERYONE (Authenticated & Anon)
-- This fixes the issue if your app is not currently logging the user in properly.

-- 1. Exams
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable all access for public" ON exams;
CREATE POLICY "Enable all access for public" ON exams
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 2. Exam Years
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON exam_years;
DROP POLICY IF EXISTS "Enable all access for public" ON exam_years;
CREATE POLICY "Enable all access for public" ON exam_years
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 3. Subjects
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON subjects;
DROP POLICY IF EXISTS "Enable all access for public" ON subjects;
CREATE POLICY "Enable all access for public" ON subjects
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 4. Questions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON questions;
DROP POLICY IF EXISTS "Enable all access for public" ON questions;
CREATE POLICY "Enable all access for public" ON questions
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

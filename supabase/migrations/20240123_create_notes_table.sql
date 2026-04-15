-- NOTES Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Access)
DROP POLICY IF EXISTS "Enable all access for public" ON notes;
CREATE POLICY "Enable all access for public" ON notes FOR ALL TO public USING (true) WITH CHECK (true);

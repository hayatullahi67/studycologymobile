-- 1. Create Storage Bucket (if not exists logic is tricky in SQL, but this attempts it)
-- Note: 'storage' schema access requires appropriate permissions.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'pdfs' );

-- Allow authenticated uploads (or public for this demo if anon key is used)
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'pdfs' );


-- 2. Create PDF Resources Table to link files to exams
CREATE TABLE IF NOT EXISTS pdf_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    exam_year_id UUID REFERENCES exam_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    size_kb NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pdf_resources ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all access for public" ON pdf_resources;
CREATE POLICY "Enable all access for public" ON pdf_resources FOR ALL TO public USING (true) WITH CHECK (true);

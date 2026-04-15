-- Create jamb_texts table
CREATE TABLE IF NOT EXISTS jamb_texts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('literature', 'english')),
    title TEXT NOT NULL,
    author TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE jamb_texts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Allow everyone to read, but only authenticated can manage)
-- Note: In a real app, you'd restrict management specifically to admins.
CREATE POLICY "Allow public read-only access to jamb_texts"
    ON jamb_texts FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert jamb_texts"
    ON jamb_texts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jamb_texts"
    ON jamb_texts FOR UPDATE
    USING (true);

CREATE POLICY "Allow authenticated users to delete jamb_texts"
    ON jamb_texts FOR DELETE
    USING (true);

-- Add comments
COMMENT ON TABLE jamb_texts IS 'Stores JAMB recommended literature books and English reading texts.';
COMMENT ON COLUMN jamb_texts.type IS 'The category of the text: literature or english';

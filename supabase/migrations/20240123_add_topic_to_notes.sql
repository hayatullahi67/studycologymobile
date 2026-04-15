-- Add topic column to notes table
ALTER TABLE notes 
ADD COLUMN topic TEXT DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN notes.topic IS 'The specific topic of the note (e.g. Newton''s Laws)';

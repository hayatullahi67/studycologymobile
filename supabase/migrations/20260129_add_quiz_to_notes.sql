-- Migration to add quiz support to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS quiz JSONB;

-- Update existing records to have an empty array if needed
-- UPDATE notes SET quiz = '[]'::jsonb WHERE quiz IS NULL;

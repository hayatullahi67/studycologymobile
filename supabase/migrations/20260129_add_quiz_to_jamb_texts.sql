-- Migration to add quiz support to jamb_texts table
ALTER TABLE jamb_texts 
ADD COLUMN IF NOT EXISTS quiz JSONB;

-- Comment mapping for clarity
COMMENT ON COLUMN jamb_texts.quiz IS 'Array of QuizQuestion objects for interactive testing.';

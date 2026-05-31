-- Allow one note row in a topic group to be marked as the first subtopic
-- shown in user-facing note details.
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add ID-backed hierarchy support for study notes.
-- Existing text columns stay in place so older notes remain readable.

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topic_id TEXT,
ADD COLUMN IF NOT EXISTS subtopic_id TEXT,
ADD COLUMN IF NOT EXISTS subtopic TEXT;

CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_subtopic_id ON notes(subtopic_id);

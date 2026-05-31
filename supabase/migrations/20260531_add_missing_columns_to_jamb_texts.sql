-- ============================================================
-- Migration: Add missing columns to jamb_texts table
-- Date: 2026-05-31
--
-- These columns exist in the local SQLite database and in the
-- app's insert/update logic but were never added to Supabase.
-- Run this in the Supabase SQL Editor to fix missing fields.
-- ============================================================

-- 1. Book cover / thumbnail URL
ALTER TABLE jamb_texts
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Book / text category (e.g. "Jamb Prose", "African Prose")
ALTER TABLE jamb_texts
    ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Subheading identifier — groups chapters under the same book
--    For new draft rows this is a temporary local ID;
--    for existing Supabase rows it links back to the original row.
ALTER TABLE jamb_texts
    ADD COLUMN IF NOT EXISTS subheading_id TEXT;

-- 4. Subheading / chapter title (e.g. "Chapter One: The Meeting")
ALTER TABLE jamb_texts
    ADD COLUMN IF NOT EXISTS subheading TEXT;

-- 5. Marks the default (first-shown) chapter for a book
ALTER TABLE jamb_texts
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Comments for clarity
-- ============================================================
COMMENT ON COLUMN jamb_texts.thumbnail_url IS 'Public URL of the book cover image stored in the book-covers storage bucket.';
COMMENT ON COLUMN jamb_texts.category     IS 'Book/text category, e.g. "Jamb Prose", "African Prose", "Comprehension".';
COMMENT ON COLUMN jamb_texts.subheading_id IS 'Groups multiple chapter rows that belong to the same book. Matches the id of the first (default) chapter row.';
COMMENT ON COLUMN jamb_texts.subheading   IS 'Chapter or subheading title within a book, e.g. "Chapter One: The Meeting".';
COMMENT ON COLUMN jamb_texts.is_default   IS 'True for the chapter that should be shown first when a user opens a book.';

-- ============================================================
-- Optional: useful index to speed up fetching all chapters
-- of a book by title (used in AddJambTextView loadText)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jamb_texts_title_type
    ON jamb_texts (type, title);

CREATE INDEX IF NOT EXISTS idx_jamb_texts_is_default
    ON jamb_texts (is_default);

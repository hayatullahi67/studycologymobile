-- Migration: Add size column to advertisements

ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT 'medium';

-- Add check constraint for size
ALTER TABLE advertisements 
DROP CONSTRAINT IF EXISTS advertisements_size_check;

ALTER TABLE advertisements 
ADD CONSTRAINT advertisements_size_check 
CHECK (size IN ('small', 'medium', 'large'));

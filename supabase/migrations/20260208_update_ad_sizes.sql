-- Migration: Update ad size constraints for Option and Square sizes

-- 1. Drop the existing constraint
ALTER TABLE advertisements 
DROP CONSTRAINT IF EXISTS advertisements_size_check;

-- 2. Add the new constraint including 'option' and 'square'
-- Keeping 'small' in the allowed values to prevent errors with existing data, 
-- even though the app no longer allows creating new 'small' ads.
ALTER TABLE advertisements 
ADD CONSTRAINT advertisements_size_check 
CHECK (size IN ('small', 'medium', 'large', 'option', 'square'));

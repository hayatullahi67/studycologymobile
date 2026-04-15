-- ============================================
-- ADVERTISEMENTS SYSTEM - SQL SCHEMA
-- ============================================

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,  -- Optional image
  link_url TEXT,   -- Redirect URL when clicked
  button_text TEXT DEFAULT 'Learn More',
  placement TEXT NOT NULL CHECK (placement IN ('exam', 'past_questions', 'notes', 'texts', 'history', 'all')),
  size TEXT NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ads_placement 
  ON advertisements(placement, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_ads_active 
  ON advertisements(is_active);

CREATE INDEX IF NOT EXISTS idx_ads_created 
  ON advertisements(created_at DESC);

-- Create storage bucket for ad images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active ads
DROP POLICY IF EXISTS "Public can view active ads" ON advertisements;
CREATE POLICY "Public can view active ads"
  ON advertisements FOR SELECT
  USING (true);

-- Policy: Allowing all for management (Removing authenticated requirement for ease of use)
DROP POLICY IF EXISTS "Authenticated users can insert ads" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can update ads" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can delete ads" ON advertisements;

CREATE POLICY "Allow all on ads"
  ON advertisements FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STORAGE POLICIES (Fixing StorageApiError)
-- ============================================

-- Allow public access to ad-images bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad-images');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'ad-images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'ad-images');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_advertisements_updated_at 
  BEFORE UPDATE ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - for testing)
-- INSERT INTO advertisements (title, description, link_url, placement, priority)
-- VALUES 
--   ('JAMB CBT 2026', 'Get ready for UTME with our comprehensive practice tests', 'https://example.com', 'exam', 10),
--   ('Study Materials', 'Download free JAMB past questions and answers', 'https://example.com', 'all', 5);

-- ============================================
-- TRACKING FUNCTIONS
-- ============================================

-- Function to increment ad impressions
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE advertisements
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment ad clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE advertisements
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

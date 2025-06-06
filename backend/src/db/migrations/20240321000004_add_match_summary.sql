-- Add summary and lastUpdated fields to matches table
ALTER TABLE matches ADD COLUMN summary TEXT;
ALTER TABLE matches ADD COLUMN summaryLastUpdated TEXT;

-- Create index for summary updates
CREATE INDEX IF NOT EXISTS idx_matches_summary_updated ON matches(summaryLastUpdated);
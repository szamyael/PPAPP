-- ─────────────────────────────────────────────
-- Study Groups Enhancements
-- ─────────────────────────────────────────────

-- Add category and tags columns to study_groups
ALTER TABLE study_groups
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_study_groups_category ON study_groups(category);
CREATE INDEX IF NOT EXISTS idx_study_groups_tags ON study_groups USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_study_groups_member_count ON study_groups(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_at ON study_groups(created_at DESC);

-- Add column to track group creation timestamp (if not already present)
ALTER TABLE study_groups
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update study group members table to ensure relationship integrity
ALTER TABLE study_group_members
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger to update updated_at for study_groups
CREATE OR REPLACE FUNCTION update_study_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_study_groups_timestamp ON study_groups;
CREATE TRIGGER update_study_groups_timestamp
  BEFORE UPDATE ON study_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_study_groups_timestamp();

-- Trigger to update updated_at for study_group_members
DROP TRIGGER IF EXISTS update_study_group_members_timestamp ON study_group_members;
CREATE TRIGGER update_study_group_members_timestamp
  BEFORE UPDATE ON study_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

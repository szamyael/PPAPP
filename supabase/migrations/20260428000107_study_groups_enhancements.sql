-- ─────────────────────────────────────────────
-- Study Groups Enhancements
-- ─────────────────────────────────────────────

-- Add category and tags columns to study_groups
ALTER TABLE if exists study_groups
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_study_groups_category ON study_groups(category);
CREATE INDEX IF NOT EXISTS idx_study_groups_tags ON study_groups USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_study_groups_member_count ON study_groups(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_at ON study_groups(created_at DESC);

-- Add column to track group creation timestamp (if not already present)
ALTER TABLE if exists study_groups
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update study group members table to ensure relationship integrity (only if table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
    and table_name = 'study_group_members'
  ) then
    alter table study_group_members
    add column if not exists updated_at timestamptz default now();
  end if;
end$$;

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

-- Trigger to update updated_at for study_group_members (only if table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
    and table_name = 'study_group_members'
  ) then
    drop trigger if exists update_study_group_members_timestamp on study_group_members;
    create trigger update_study_group_members_timestamp
      before update on study_group_members
      for each row
      execute function public.set_updated_at();
  end if;
end$$;

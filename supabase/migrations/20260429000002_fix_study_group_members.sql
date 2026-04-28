-- ============================================================
-- Migration: Ensure study_group_members table exists
-- ============================================================
-- This migration ensures the study_group_members table is created with all
-- necessary columns and configuration

-- Create study_group_members table if it doesn't exist
create table if not exists public.study_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- Enable RLS if not already enabled
alter table if exists public.study_group_members enable row level security;

-- Ensure RLS policies exist
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'study_group_members'
  ) then
    drop policy if exists "members read" on public.study_group_members;
    create policy "members read" on public.study_group_members for select using (true);

    drop policy if exists "members join" on public.study_group_members;
    create policy "members join" on public.study_group_members for insert with check (auth.uid() = user_id);
  end if;
end$$;

-- Add real-time for study_group_members if not already added
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'study_group_members'
  ) then
    alter publication supabase_realtime add table public.study_group_members;
  end if;
end$$;

-- Ensure trigger function exists for updated_at (should be created in core_schema)
-- Create it here as a fallback if needed
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Create trigger for study_group_members if table exists and trigger doesn't
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'study_group_members'
  ) then
    drop trigger if exists update_study_group_members_timestamp on study_group_members;
    create trigger update_study_group_members_timestamp
      before update on study_group_members
      for each row
      execute function public.set_updated_at();
  end if;
end$$;


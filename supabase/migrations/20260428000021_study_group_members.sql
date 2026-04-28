-- Migration: Study Group Enhancements
create table if not exists public.study_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.study_group_members enable row level security;

drop policy if exists "members read" on public.study_group_members;
create policy "members read" on public.study_group_members for select using (true);

drop policy if exists "members join" on public.study_group_members;
create policy "members join" on public.study_group_members for insert with check (auth.uid() = user_id);

-- Add real-time for study_group_members
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'study_group_members'
  ) then
    alter publication supabase_realtime add table public.study_group_members;
  end if;
end$$;

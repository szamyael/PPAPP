-- Migration: Force Sync Profiles Columns
-- This ensures all columns exist even if the table was created by an older version

alter table public.profiles 
  add column if not exists full_name       text not null default '',
  add column if not exists email           text not null default '',
  add column if not exists role            text check (role in ('admin', 'student', 'tutor', 'organization')),
  add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists student_id      text,
  add column if not exists program         text,
  add column if not exists year_level      text,
  add column if not exists department      text,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Ensure role is not null for future inserts
alter table public.profiles alter column role set not null;

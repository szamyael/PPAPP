-- ============================================================
-- Migration: Storage Buckets + Policies
-- ============================================================

-- Safely ensure schema exists in case of manual dashboard changes on standard tables
alter table public.profiles 
  add column if not exists role text not null default 'student' check (role in ('admin', 'student', 'tutor', 'organization')),
  add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists avatar_url text,
  add column if not exists student_id text,
  add column if not exists program text,
  add column if not exists year_level text,
  add column if not exists department text;

alter table public.tutor_profiles 
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',     'avatars',     true,  2097152,   array['image/png','image/jpeg','image/webp','image/gif']),
  ('credentials', 'credentials', false, 10485760,  array['application/pdf','image/png','image/jpeg']),
  ('materials',   'materials',   false, 52428800,  array['application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','video/mp4','image/png','image/jpeg'])
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- --------------------------------
-- AVATARS bucket (public read, owner write)
-- --------------------------------
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_insert"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------------------
-- CREDENTIALS bucket (tutor owner + org admin reads)
-- --------------------------------
drop policy if exists "credentials_owner_insert" on storage.objects;
drop policy if exists "credentials_owner_read"   on storage.objects;
drop policy if exists "credentials_org_read"     on storage.objects;
drop policy if exists "credentials_owner_delete" on storage.objects;

create policy "credentials_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "credentials_owner_read" on storage.objects
  for select using (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Org admins can read credentials of tutors in their org
create policy "credentials_org_read" on storage.objects
  for select using (
    bucket_id = 'credentials'
    and exists (
      select 1
      from public.tutor_profiles tp
      join public.profiles p on p.id = auth.uid()
      where tp.user_id::text = (storage.foldername(name))[1]
        and tp.organization_id = p.organization_id
        and p.role = 'organization'
    )
  );

create policy "credentials_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'credentials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------------------
-- MATERIALS bucket (tutor insert, org + approved students read)
-- --------------------------------
drop policy if exists "materials_owner_insert" on storage.objects;
drop policy if exists "materials_owner_read"   on storage.objects;
drop policy if exists "materials_org_read"     on storage.objects;
drop policy if exists "materials_owner_delete" on storage.objects;

create policy "materials_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'tutor' and approval_status = 'approved'
    )
  );

create policy "materials_owner_read" on storage.objects
  for select using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Org members and approved students can read approved materials
create policy "materials_org_read" on storage.objects
  for select using (
    bucket_id = 'materials'
    and exists (
      select 1
      from public.materials m
      join public.profiles p on p.id = auth.uid()
      where m.file_url like '%' || name || '%'
        and m.approval_status = 'approved'
        and p.approval_status = 'approved'
    )
  );

create policy "materials_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

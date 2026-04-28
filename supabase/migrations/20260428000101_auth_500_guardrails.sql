-- Migration: Auth 500 Guardrails (policy recursion + JWT hook safety)
-- Purpose: Ensure Supabase Auth login/signup never 500s due to:
-- - recursive RLS policy on public.profiles (admin checks querying profiles)
-- - custom_access_token_hook throwing exceptions

-- ─────────────────────────────────────────────
-- 1) Non-recursive admin check (SECURITY DEFINER)
-- ─────────────────────────────────────────────
drop function if exists public.check_is_admin();

create or replace function public.check_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 2) Profiles policies: drop the recursive one, add safe admin policies
--    NOTE: keep existing owner/public read policies from earlier migrations.
-- ─────────────────────────────────────────────
drop policy if exists "profiles_admin_all" on public.profiles;

-- Admins can insert/update/delete any profile rows.
-- (Select is already covered by "profiles_public_read" in this repo.)
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_admin_delete" on public.profiles;

create policy "profiles_admin_insert"
  on public.profiles
  for insert
  with check (public.check_is_admin());

create policy "profiles_admin_update"
  on public.profiles
  for update
  using (public.check_is_admin())
  with check (public.check_is_admin());

create policy "profiles_admin_delete"
  on public.profiles
  for delete
  using (public.check_is_admin());

-- ─────────────────────────────────────────────
-- 3) JWT hook: never throw (return event unchanged on any error)
-- ─────────────────────────────────────────────
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims    jsonb;
  user_role text;
  uid       uuid;
begin
  -- 1) Extract user id safely
  begin
    uid := (event ->> 'user_id')::uuid;
  exception when others then
    return event;
  end;

  -- 2) Fetch role safely (security definer bypasses RLS)
  begin
    select role into user_role
    from public.profiles
    where id = uid;
  exception when others then
    user_role := null;
  end;

  -- 3) Update claims with fallback
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'student')));

  return jsonb_set(event, '{claims}', claims);
exception when others then
  return event;
end;
$$;

-- Permissions required for the auth service to call the hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- This is safe for RLS checks (evaluates as the invoker but bypasses RLS via definer)
grant execute on function public.check_is_admin to authenticated;


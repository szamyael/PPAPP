-- Migration: Fix RLS Recursion and Auth Hook Stability
-- This migration removes the recursive 'ALL' policy and replaces it with non-recursive ones.

-- 1. FIX RLS RECURSION ON PROFILES
-- Drop the recursive policy
drop policy if exists "profiles_admin_all" on public.profiles;

-- Clean up any previous is_admin functions to avoid ambiguity
drop function if exists public.is_admin();
drop function if exists public.is_admin(uuid);

-- Add non-recursive policies for non-select actions
-- We use a function that is SECURITY DEFINER to bypass RLS for the check
create or replace function public.check_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Directly query the table. Since this is security definer, it bypasses RLS.
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

create policy "profiles_admin_insert" on public.profiles for insert with check (public.check_is_admin());
create policy "profiles_admin_update" on public.profiles for update using (public.check_is_admin());
create policy "profiles_admin_delete" on public.profiles for delete using (public.check_is_admin());

-- 2. HARDEN JWT HOOK
-- Ensure it can never fail and cause a 500 on login
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
  -- 1. Safely extract user_id
  begin
    uid := (event ->> 'user_id')::uuid;
  exception when others then
    return event; -- Return unchanged on error
  end;

  -- 2. Safely fetch role from profiles
  -- Since this is security definer, it bypasses RLS and won't recurse.
  begin
    select role into user_role
    from public.profiles
    where id = uid;
  exception when others then
    user_role := 'student'; -- Fallback
  end;

  -- 3. Update claims
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'student')));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- 3. RE-GRANT PERMISSIONS
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant execute on function public.check_is_admin to authenticated;

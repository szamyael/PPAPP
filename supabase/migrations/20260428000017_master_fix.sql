-- Migration: Master Fix for 500 Errors (Safe subset)
-- Resolves: 
-- 1. RLS recursion in profiles table
-- 2. Missing permissions for anon/authenticated roles
-- 3. Safe JWT Hook with role fallback

-- 1. RLS RECURSION FIX
-- Use a security definer function to check admin role without recursion
create or replace function public.is_admin(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$;

-- Update profiles policies
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin(auth.uid()));

-- 2. PERMISSIONS FIX
grant usage on schema public to anon, authenticated;
grant usage on schema public to supabase_auth_admin;

-- Ensure all tables are accessible (RLS still applies)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert on all tables in schema public to anon;
grant usage on all sequences in schema public to authenticated, anon;

-- 3. RESTORE WORKING JWT HOOK
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
  -- Extract user id safely
  begin
    uid := (event ->> 'user_id')::uuid;
  exception when others then
    uid := null;
  end;

  -- Fetch role from profiles safely
  if uid is not null then
    begin
      select role into user_role
      from public.profiles
      where id = uid;
    exception when others then
      user_role := null;
    end;
  end if;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- Fallback to 'student' if role not found
  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{role}', '"student"'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

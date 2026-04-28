-- Migration: Fix JWT claim key for app role
-- Supabase reserves the `role` claim for database role switching (e.g. `anon`, `authenticated`).
-- Overwriting it with an application role (e.g. `admin`, `student`) can break Auth token issuance
-- and downstream APIs. Store the application role under `app_role` instead.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims    jsonb;
  app_role  text;
  uid       uuid;
begin
  -- Extract user id safely
  begin
    uid := (event ->> 'user_id')::uuid;
  exception when others then
    return event;
  end;

  -- Fetch application role safely (security definer bypasses RLS)
  begin
    select role into app_role
    from public.profiles
    where id = uid;
  exception when others then
    app_role := null;
  end;

  -- Update claims with fallback, WITHOUT touching the reserved `role` claim
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_role}', to_jsonb(coalesce(app_role, 'student')));

  return jsonb_set(event, '{claims}', claims);
exception when others then
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;


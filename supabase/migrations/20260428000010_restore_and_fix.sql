-- Migration: Restore and Harden Auth Triggers
-- This replaces the debug/bypass versions with production-ready ones

-- 1. Restore the handle_new_user trigger on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if v_role = 'admin' then
    v_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    v_role,
    'pending'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when profiles.full_name = '' then excluded.full_name else profiles.full_name end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Restore the Custom Access Token Hook with full logic
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  claims    jsonb;
  user_role text;
  uid       uuid;
begin
  begin
    uid := (event ->> 'user_id')::uuid;
  exception when others then
    uid := null;
  end;

  if uid is not null then
    select role into user_role
    from public.profiles
    where id = uid;
  end if;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{role}', '"student"'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

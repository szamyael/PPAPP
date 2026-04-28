-- Migration: Add Verification Status to Profiles
-- This allows the app to track if the user has completed the OTP step

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

-- Update the handle_new_user trigger to set initial state
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  
  insert into public.profiles (id, full_name, email, role, approval_status, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    v_role,
    'pending',
    false -- Initially unverified
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when profiles.full_name = '' then excluded.full_name else profiles.full_name end;

  return new;
end;
$$;

-- Create a function to mark verified on login (first successful session)
-- This is called via a trigger on auth.users update (email_confirmed_at)
create or replace function public.handle_user_verification()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
    set is_verified = true
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
  after update on auth.users
  for each row execute procedure public.handle_user_verification();

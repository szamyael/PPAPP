-- Migration: Add split name fields to profiles table
-- Run after 20260428000001_core_schema.sql

alter table public.profiles
  add column if not exists first_name  text,
  add column if not exists middle_name text,
  add column if not exists last_name   text,
  add column if not exists suffix      text;

-- Update full_name when split fields are present (back-compat)
create or replace function public.sync_full_name()
returns trigger language plpgsql as $$
begin
  if new.first_name is not null then
    new.full_name := trim(concat_ws(' ',
      new.first_name,
      new.middle_name,
      new.last_name,
      new.suffix
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists sync_full_name_trigger on public.profiles;
create trigger sync_full_name_trigger
  before insert or update on public.profiles
  for each row execute procedure public.sync_full_name();

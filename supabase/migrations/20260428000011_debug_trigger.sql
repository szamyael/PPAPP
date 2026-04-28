-- Migration: Debug Log for Auth Trigger
create table if not exists public.debug_logs (
  id         uuid primary key default gen_random_uuid(),
  message    text,
  context    jsonb,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  
  insert into public.debug_logs (message, context)
  values ('Attempting profile insert', jsonb_build_object('id', new.id, 'role', v_role, 'email', new.email));

  begin
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
      
    insert into public.debug_logs (message) values ('Profile insert success');
  exception when others then
    insert into public.debug_logs (message, context)
    values ('Profile insert failed', jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE));
    -- Rethrow to let Auth know it failed, but now we have the log
    raise exception 'Profile creation failed: %', SQLERRM;
  end;

  return new;
end;
$$;

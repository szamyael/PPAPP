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

  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  else
    -- Default: treat as student if no profile found yet
    claims := jsonb_set(claims, '{role}', '"student"'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

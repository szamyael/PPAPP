create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
begin
  -- Return event immediately to debug if DB lookups cause timeout
  return event;
end;
$$;

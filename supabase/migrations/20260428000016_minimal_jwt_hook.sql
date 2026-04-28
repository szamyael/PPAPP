-- Migration: Minimal JWT Hook (Safe version)
-- Returns the event unchanged to bypass any potential 500 errors in the auth flow.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
begin
  return event;
end;
$$;

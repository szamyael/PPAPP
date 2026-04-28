-- Migration: Add sender_id to chat_messages
alter table public.chat_messages add column if not exists sender_id uuid references auth.users(id);

-- Add real-time for chat_messages if not already there
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end$$;

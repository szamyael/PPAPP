-- ============================================================
-- Migration: Finalize Profile Relationships and RLS
-- ============================================================

-- 1. Add direct foreign key from tutor_profiles to profiles
-- This is required for PostgREST relationship traversal in .select()
alter table public.tutor_profiles
drop constraint if exists tutor_profiles_user_id_fkey;

alter table public.tutor_profiles
add constraint tutor_profiles_user_id_fkey
foreign key (user_id) references public.profiles(id) on delete cascade;

-- 2. Relax ratings RLS so anyone authenticated can read reviews
-- The previous policy restricted reading to participants only.
drop policy if exists "ratings_participant_read" on public.ratings;

create policy "ratings_read_all" on public.ratings
  for select using (auth.uid() is not null);

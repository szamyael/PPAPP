-- ============================================================
-- Migration: Add Foreign Key Relationships from Bookings, Ratings, and Materials to Profiles
-- ============================================================
-- This migration adds explicit foreign key constraints to the profiles table,
-- enabling PostgREST relationship traversal for API queries

-- Add tutor_profile foreign key (same as tutor_id but explicit for API)
alter table public.bookings
add constraint bookings_tutor_profile_fkey
foreign key (tutor_id) references public.profiles(id) on delete cascade;

-- Add student_profile foreign key (same as student_id but explicit for API)
alter table public.bookings
add constraint bookings_student_profile_fkey
foreign key (student_id) references public.profiles(id) on delete cascade;

-- Add rated_by_profile foreign key to ratings
alter table public.ratings
add constraint ratings_rated_by_profile_fkey
foreign key (rated_by) references public.profiles(id) on delete cascade;

-- Add rated_user_profile foreign key to ratings
alter table public.ratings
add constraint ratings_rated_user_profile_fkey
foreign key (rated_user) references public.profiles(id) on delete cascade;

-- Add tutor_profile foreign key to materials
alter table public.materials
add constraint materials_tutor_profile_fkey
foreign key (tutor_id) references public.profiles(id) on delete cascade;

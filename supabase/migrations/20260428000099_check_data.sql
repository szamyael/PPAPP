-- Temporary migration to check data
-- This is just for debugging
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles;
  RAISE NOTICE 'Profiles count: %', v_count;
END $$;

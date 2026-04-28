-- Migration: Seed Accounts

-- Ensure pgcrypto exists
create extension if not exists pgcrypto with schema extensions;

-- Try to drop any offending triggers that might be using updated_at
drop trigger if exists users_updated_at on auth.users;
drop trigger if exists handle_updated_at on auth.users;
drop trigger if exists set_updated_at on auth.users;
drop trigger if exists profiles_updated_at on public.profiles;

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_org_id uuid := gen_random_uuid();
  v_tutor_id uuid := gen_random_uuid();
  v_student_id uuid := gen_random_uuid();
  v_org_table_id uuid := gen_random_uuid();
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Insert Admin if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@piyupairlspu.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, confirmation_token, recovery_token, email_change_token_new, phone_change_token)
    VALUES (v_instance_id, v_admin_id, 'authenticated', 'authenticated', 'admin@piyupairlspu.com', extensions.crypt('admin123', extensions.gen_salt('bf')), now(), '{"role":"admin", "full_name":"Admin User"}', now(), '', '', '', '');
  ELSE
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@piyupairlspu.com';
  END IF;

  -- Insert Organization if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'orgz@piyupairlspu.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, confirmation_token, recovery_token, email_change_token_new, phone_change_token)
    VALUES (v_instance_id, v_org_id, 'authenticated', 'authenticated', 'orgz@piyupairlspu.com', extensions.crypt('admin123', extensions.gen_salt('bf')), now(), '{"role":"organization", "full_name":"Test Organization"}', now(), '', '', '', '');
  ELSE
    SELECT id INTO v_org_id FROM auth.users WHERE email = 'orgz@piyupairlspu.com';
  END IF;

  -- Insert Tutor if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tutor@piyupairlspu.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, confirmation_token, recovery_token, email_change_token_new, phone_change_token)
    VALUES (v_instance_id, v_tutor_id, 'authenticated', 'authenticated', 'tutor@piyupairlspu.com', extensions.crypt('admin123', extensions.gen_salt('bf')), now(), '{"role":"tutor", "full_name":"Test Tutor"}', now(), '', '', '', '');
  ELSE
    SELECT id INTO v_tutor_id FROM auth.users WHERE email = 'tutor@piyupairlspu.com';
  END IF;

  -- Insert Student if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@piyupairlspu.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, confirmation_token, recovery_token, email_change_token_new, phone_change_token)
    VALUES (v_instance_id, v_student_id, 'authenticated', 'authenticated', 'student@piyupairlspu.com', extensions.crypt('admin123', extensions.gen_salt('bf')), now(), '{"role":"student", "full_name":"Test Student"}', now(), '', '', '', '');
  ELSE
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@piyupairlspu.com';
  END IF;

  -- Create organization in public.organizations if not exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE unique_code = 'ORGZ-12345') THEN
    INSERT INTO public.organizations (id, name, unique_code, created_by, created_at)
    VALUES (v_org_table_id, 'Test Organization', 'ORGZ-12345', v_org_id, now());
  ELSE
    SELECT id INTO v_org_table_id FROM public.organizations WHERE unique_code = 'ORGZ-12345';
  END IF;

  -- Triggers have fired and created profiles. Now we update them.
  UPDATE public.profiles 
  SET approval_status = 'approved', is_verified = true 
  WHERE id IN (v_admin_id, v_org_id, v_tutor_id, v_student_id);

  -- Map org and tutor profiles to the organization
  UPDATE public.profiles SET organization_id = v_org_table_id WHERE id IN (v_org_id, v_tutor_id);
  
  -- Create tutor profile if not exists
  IF NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE user_id = v_tutor_id) THEN
    INSERT INTO public.tutor_profiles (user_id, organization_id, approval_status, subjects, education, experience)
    VALUES (v_tutor_id, v_org_table_id, 'approved', ARRAY['Mathematics', 'Science'], 'BSc Education', '3 years of teaching experience');
  END IF;

END $$;

-- Restore the profiles trigger
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

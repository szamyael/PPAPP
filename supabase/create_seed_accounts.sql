DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_org_id uuid := gen_random_uuid();
  v_tutor_id uuid := gen_random_uuid();
  v_student_id uuid := gen_random_uuid();
  v_org_table_id uuid := gen_random_uuid();
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Insert Admin
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (v_instance_id, v_admin_id, 'authenticated', 'authenticated', 'admin@piyupairlspu.com', crypt('admin123', gen_salt('bf')), now(), '{"role":"admin", "full_name":"System Admin"}', now(), now());

  -- Insert Organization
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (v_instance_id, v_org_id, 'authenticated', 'authenticated', 'orgz@piyupairlspu.com', crypt('admin123', gen_salt('bf')), now(), '{"role":"organization", "full_name":"Test Organization"}', now(), now());

  -- Insert Tutor
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (v_instance_id, v_tutor_id, 'authenticated', 'authenticated', 'tutor@piyupairlspu.com', crypt('admin123', gen_salt('bf')), now(), '{"role":"tutor", "full_name":"Test Tutor"}', now(), now());

  -- Insert Student
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (v_instance_id, v_student_id, 'authenticated', 'authenticated', 'student@piyupairlspu.com', crypt('admin123', gen_salt('bf')), now(), '{"role":"student", "full_name":"Test Student"}', now(), now());

  -- Triggers have fired and created profiles. Now we update them.
  UPDATE public.profiles 
  SET approval_status = 'approved', is_verified = true 
  WHERE id IN (v_admin_id, v_org_id, v_tutor_id, v_student_id);

  -- Create organization in public.organizations
  INSERT INTO public.organizations (id, admin_id, name, unique_code, description, verification_status, created_at)
  VALUES (v_org_table_id, v_org_id, 'Test Organization', 'ORGZ-12345', 'Test Org Account', 'verified', now());

  -- Map org and tutor profiles to the organization
  UPDATE public.profiles SET organization_id = v_org_table_id WHERE id IN (v_org_id, v_tutor_id);
  
  -- Create tutor profile
  INSERT INTO public.tutor_profiles (user_id, organization_id, approval_status, subjects, education, experience)
  VALUES (v_tutor_id, v_org_table_id, 'approved', ARRAY['Mathematics', 'Science'], 'BSc Education', '3 years of teaching experience');

END $$;

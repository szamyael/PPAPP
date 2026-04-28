-- Migration: Fix Auth Scan Error (Data Only)
-- Resolves: "sql: Scan error on column index 3, name \"confirmation_token\": converting NULL to string is unsupported"
-- This version only performs UPDATEs as ALTER TABLE on auth.users is restricted on remote projects.

DO $$
BEGIN
  -- 1. Fix confirmation_token
  UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;

  -- 2. Fix recovery_token
  UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;

  -- 3. Fix email_change_token_new
  UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;

  -- 4. Fix phone_change_token
  UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;

  -- 5. Fix reauthentication_token
  UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
  
  -- 6. Fix email_change_token_current (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_current') THEN
    UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
  END IF;

END $$;

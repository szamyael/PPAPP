-- Migration: Fix Auth Scan Error (Email Change)
-- Resolves: "sql: Scan error on column index 8, name \"email_change\": converting NULL to string is unsupported"

DO $$
BEGIN
  -- 1. Fix email_change (Pending email address)
  UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;

END $$;

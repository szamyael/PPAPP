-- Migration: Fix auth.users role NULLs
-- This uses a simple UPDATE which is usually allowed even if you are not the owner, 
-- as long as you have the necessary privileges granted to the postgres role.

UPDATE auth.users SET role = 'authenticated' WHERE role IS NULL;

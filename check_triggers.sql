SELECT tgname, relname FROM pg_trigger JOIN pg_class ON pg_class.oid = tgrelid JOIN pg_proc ON pg_proc.oid = tgfoid WHERE proname = 'set_updated_at';

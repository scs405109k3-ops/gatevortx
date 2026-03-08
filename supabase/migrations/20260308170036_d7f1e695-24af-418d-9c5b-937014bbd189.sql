
-- Step 1: Add user_code column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;

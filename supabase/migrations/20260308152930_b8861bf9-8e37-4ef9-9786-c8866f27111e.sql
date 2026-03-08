
-- Add work timing columns to profiles (admin sets these for the org)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_start_time time DEFAULT '09:00:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_end_time time DEFAULT '17:00:00';

-- Add 'teacher' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

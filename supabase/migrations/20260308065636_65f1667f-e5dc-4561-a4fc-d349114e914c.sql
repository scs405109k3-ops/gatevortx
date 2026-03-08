
-- Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Helper function to check if a user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, true) FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Admins can update team member profiles (to deactivate/reactivate)
DROP POLICY IF EXISTS "Admins can update company member profiles" ON public.profiles;
CREATE POLICY "Admins can update company member profiles"
  ON public.profiles FOR UPDATE
  USING (
    is_company_admin(auth.uid()) AND
    company_name = get_user_company(auth.uid()) AND
    role != 'admin'
  );

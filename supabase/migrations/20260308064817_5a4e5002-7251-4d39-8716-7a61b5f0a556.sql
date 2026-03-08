
-- Allow anyone (including unauthenticated) to read admin company names only
-- This is needed so the login page can populate the company dropdown before auth
CREATE POLICY "Public can view admin company names"
ON public.profiles FOR SELECT
USING (role = 'admin');

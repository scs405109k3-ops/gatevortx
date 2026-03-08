
-- 1. Security-definer function: get company_name for any user (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_name FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- 2. Helper: check if user is admin of a specific company
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  );
$$;

-- =====================================================================
-- PROFILES: company-scoped SELECT (users see only own company)
-- =====================================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own company profiles"
ON public.profiles FOR SELECT
USING (
  company_name IS NOT NULL
  AND company_name != ''
  AND company_name = public.get_user_company(auth.uid())
);

-- =====================================================================
-- VISITORS: company-scoped policies
-- =====================================================================
DROP POLICY IF EXISTS "Guards and admins can view visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can update visitor status" ON public.visitors;
DROP POLICY IF EXISTS "Guards can insert visitors" ON public.visitors;

CREATE POLICY "Guards and admins view company visitors"
ON public.visitors FOR SELECT
USING (
  (auth.uid() = guard_id OR public.is_company_admin(auth.uid()))
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles g WHERE g.id = guard_id
        AND g.company_name = public.get_user_company(auth.uid())
        AND g.company_name IS NOT NULL AND g.company_name != ''
    )
  )
);

CREATE POLICY "Admins update company visitor status"
ON public.visitors FOR UPDATE
USING (
  public.is_company_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles g WHERE g.id = guard_id
      AND g.company_name = public.get_user_company(auth.uid())
  )
);

CREATE POLICY "Guards insert visitors for own company"
ON public.visitors FOR INSERT
WITH CHECK (
  auth.uid() = guard_id
  AND public.get_user_company(auth.uid()) IS NOT NULL
  AND public.get_user_company(auth.uid()) != ''
);

-- =====================================================================
-- ATTENDANCE: company-scoped policies
-- =====================================================================
DROP POLICY IF EXISTS "Employees can select own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can update own attendance" ON public.attendance;

CREATE POLICY "Employees and admins view company attendance"
ON public.attendance FOR SELECT
USING (
  auth.uid() = employee_id
  OR (
    public.is_company_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles ep WHERE ep.id = employee_id
        AND ep.company_name = public.get_user_company(auth.uid())
    )
  )
);

CREATE POLICY "Employees insert own attendance"
ON public.attendance FOR INSERT
WITH CHECK (
  auth.uid() = employee_id
  AND public.get_user_company(auth.uid()) IS NOT NULL
  AND public.get_user_company(auth.uid()) != ''
);

CREATE POLICY "Employees update own attendance"
ON public.attendance FOR UPDATE
USING (auth.uid() = employee_id);

-- =====================================================================
-- LEAVE REQUESTS: company-scoped policies
-- =====================================================================
DROP POLICY IF EXISTS "Employees and admins can view leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can insert own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update leave requests" ON public.leave_requests;

CREATE POLICY "Employees and admins view company leave requests"
ON public.leave_requests FOR SELECT
USING (
  auth.uid() = employee_id
  OR (
    public.is_company_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles ep WHERE ep.id = employee_id
        AND ep.company_name = public.get_user_company(auth.uid())
    )
  )
);

CREATE POLICY "Employees insert own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (
  auth.uid() = employee_id
  AND public.get_user_company(auth.uid()) IS NOT NULL
  AND public.get_user_company(auth.uid()) != ''
);

CREATE POLICY "Admins update company leave requests"
ON public.leave_requests FOR UPDATE
USING (
  public.is_company_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles ep WHERE ep.id = employee_id
      AND ep.company_name = public.get_user_company(auth.uid())
  )
);


-- Fix leave_requests SELECT policy so admins can see ALL leaves from their company
DROP POLICY IF EXISTS "Employees and admins view company leave requests" ON public.leave_requests;

CREATE POLICY "Employees and admins view company leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() = employee_id
  OR (
    is_company_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles ep
      WHERE ep.id = leave_requests.employee_id
        AND ep.company_name = get_user_company(auth.uid())
        AND ep.company_name IS NOT NULL
        AND ep.company_name <> ''
    )
  )
);

-- Recreate INSERT policy (unchanged, but ensure it covers all non-admin roles)
DROP POLICY IF EXISTS "Employees insert own leave requests" ON public.leave_requests;

CREATE POLICY "Employees insert own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  auth.uid() = employee_id
  AND get_user_company(auth.uid()) IS NOT NULL
  AND get_user_company(auth.uid()) <> ''
);

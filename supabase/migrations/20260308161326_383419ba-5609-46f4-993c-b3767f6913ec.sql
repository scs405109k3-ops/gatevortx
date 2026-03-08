-- Drop the conflicting old policy (note trailing space in original name)
DROP POLICY IF EXISTS "Company members view attendance" ON public.attendance;

-- Recreate with teacher support
CREATE POLICY "Company members view attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  (auth.uid() = employee_id)
  OR is_company_admin(auth.uid())
  OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('guard'::app_role, 'teacher'::app_role)
    AND profiles.company_name = get_user_company(attendance.employee_id)
  ))
);
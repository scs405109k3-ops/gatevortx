-- Add guard_id column to attendance table to track which guard marked each record
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS guard_id uuid;

-- Allow guards to insert attendance (they are the ones marking)
-- Update existing INSERT policy to also allow guards
DROP POLICY IF EXISTS "Employees insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Guards insert attendance" ON public.attendance;

CREATE POLICY "Employees or guards insert attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  (auth.uid() = employee_id AND get_user_company(auth.uid()) IS NOT NULL AND get_user_company(auth.uid()) <> '')
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guard'))
);

-- Allow guards to update attendance (check-in, check-out, status)
DROP POLICY IF EXISTS "Employees update own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Guards update attendance" ON public.attendance;

CREATE POLICY "Employees or guards update attendance"
ON public.attendance
FOR UPDATE
USING (
  auth.uid() = employee_id
  OR (guard_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guard' AND company_name = get_user_company(employee_id))
);

-- Admins and guards can select attendance in their company
DROP POLICY IF EXISTS "Employees and admins view company attendance" ON public.attendance;

CREATE POLICY "Company members view attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() = employee_id
  OR is_company_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guard' AND company_name = get_user_company(employee_id))
);
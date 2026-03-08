
CREATE OR REPLACE FUNCTION public.get_company_users(_company_name text)
RETURNS TABLE(name text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name, p.email, p.role::text
  FROM public.profiles p
  WHERE p.company_name = _company_name
    AND p.is_active = true
    AND p.role != 'admin'
  ORDER BY p.role, p.name;
$$;

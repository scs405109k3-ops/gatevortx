
-- Step 2: Auto-generate function, trigger, backfill, lookup function

CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INT;
  new_code TEXT;
BEGIN
  IF NEW.user_code IS NOT NULL AND NEW.user_code != '' THEN
    RETURN NEW;
  END IF;
  CASE NEW.role
    WHEN 'admin' THEN prefix := 'ADM';
    WHEN 'guard' THEN prefix := 'GRD';
    WHEN 'teacher' THEN prefix := 'TCH';
    WHEN 'employee' THEN prefix := 'EMP';
    ELSE prefix := 'USR';
  END CASE;
  SELECT COALESCE(MAX(
    CASE WHEN user_code ~ ('^' || prefix || '[0-9]+$')
    THEN SUBSTRING(user_code FROM LENGTH(prefix) + 1)::INT ELSE 0 END
  ), 0) + 1 INTO next_num FROM public.profiles WHERE user_code LIKE prefix || '%';
  new_code := prefix || LPAD(next_num::TEXT, 3, '0');
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = new_code) LOOP
    next_num := next_num + 1;
    new_code := prefix || LPAD(next_num::TEXT, 3, '0');
  END LOOP;
  NEW.user_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_user_code ON public.profiles;
CREATE TRIGGER trigger_generate_user_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_user_code();

-- Backfill existing profiles
DO $$
DECLARE
  rec RECORD;
  prefix TEXT;
  next_num INT;
  new_code TEXT;
BEGIN
  FOR rec IN SELECT id, role FROM public.profiles WHERE user_code IS NULL ORDER BY created_at LOOP
    CASE rec.role
      WHEN 'admin' THEN prefix := 'ADM';
      WHEN 'guard' THEN prefix := 'GRD';
      WHEN 'teacher' THEN prefix := 'TCH';
      WHEN 'employee' THEN prefix := 'EMP';
      ELSE prefix := 'USR';
    END CASE;
    SELECT COALESCE(MAX(
      CASE WHEN user_code ~ ('^' || prefix || '[0-9]+$')
      THEN SUBSTRING(user_code FROM LENGTH(prefix) + 1)::INT ELSE 0 END
    ), 0) + 1 INTO next_num FROM public.profiles WHERE user_code LIKE prefix || '%';
    new_code := prefix || LPAD(next_num::TEXT, 3, '0');
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = new_code) LOOP
      next_num := next_num + 1;
      new_code := prefix || LPAD(next_num::TEXT, 3, '0');
    END LOOP;
    UPDATE public.profiles SET user_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Drop old function signature and recreate
DROP FUNCTION IF EXISTS public.get_company_users(text);

CREATE FUNCTION public.get_company_users(_company_name text)
RETURNS TABLE(name text, email text, role text, user_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name, p.email, p.role::text, p.user_code
  FROM public.profiles p
  WHERE p.company_name = _company_name
    AND p.is_active = true
    AND p.role != 'admin'
  ORDER BY p.role, p.name;
$$;

-- Lookup function for login
CREATE OR REPLACE FUNCTION public.get_email_by_user_code(_user_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE user_code = UPPER(_user_code) LIMIT 1;
$$;

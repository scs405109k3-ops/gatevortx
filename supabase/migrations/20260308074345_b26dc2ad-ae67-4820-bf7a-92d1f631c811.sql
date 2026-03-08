-- Table to store device push tokens per user
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown', -- 'ios' | 'android' | 'web'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can insert own device tokens"
ON public.device_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own device tokens"
ON public.device_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
ON public.device_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Admins can read device tokens within their company to send push
CREATE POLICY "Admins can read company device tokens"
ON public.device_tokens FOR SELECT
USING (
  is_company_admin(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = device_tokens.user_id
    AND profiles.company_name = get_user_company(auth.uid())
  )
);
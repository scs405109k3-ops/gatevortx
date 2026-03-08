
-- MailVortx emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  deleted_by_sender BOOLEAN NOT NULL DEFAULT false,
  deleted_by_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view sent emails"
  ON public.emails FOR SELECT
  USING (auth.uid() = from_user_id AND NOT deleted_by_sender);

CREATE POLICY "Recipient can view received emails"
  ON public.emails FOR SELECT
  USING (auth.uid() = to_user_id AND NOT deleted_by_recipient);

CREATE POLICY "Users can send emails"
  ON public.emails FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Sender can update own emails"
  ON public.emails FOR UPDATE
  USING (auth.uid() = from_user_id);

CREATE POLICY "Recipient can update received emails"
  ON public.emails FOR UPDATE
  USING (auth.uid() = to_user_id);

-- MailVortx labels table
CREATE TABLE public.email_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own labels"
  ON public.email_labels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Email label assignments (many-to-many)
CREATE TABLE public.email_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.email_labels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, label_id)
);

ALTER TABLE public.email_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own label assignments"
  ON public.email_label_assignments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_email_updated_at();


-- Add photo_url and checked_out_at to attendance table for guard attendance tracking
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- Add checked_out_at to visitors for guard to update when visitor leaves
ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- Create employee-photos storage bucket (private, auto-deleted daily)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Guards can upload to employee-photos bucket
CREATE POLICY "Guards can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos'
  AND auth.uid() IS NOT NULL
);

-- Guards and admins can view employee photos
CREATE POLICY "Guards and admins can view employee photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-photos'
  AND auth.uid() IS NOT NULL
);

-- Guards and admins can delete employee photos (for daily cleanup)
CREATE POLICY "Guards and admins can delete employee photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos'
  AND auth.uid() IS NOT NULL
);

-- Allow guards to update visitors checkout time
CREATE POLICY "Guards update own visitor checkout"
ON public.visitors FOR UPDATE
USING (auth.uid() = guard_id);

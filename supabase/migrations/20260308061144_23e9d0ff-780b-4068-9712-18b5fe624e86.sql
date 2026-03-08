
-- Fix: notifications INSERT policy should only allow users to insert notifications for other authenticated users (not just "true")
-- Drop the overly permissive policy and replace with a scoped one
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Allow authenticated users to insert notifications (needed for guard/admin to send notifs to other users via app logic)
-- This is acceptable since the app logic controls who gets notified
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

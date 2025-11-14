-- Migration: Update RLS policies for notifications table
-- Supports customer session-based access (role IS NULL for customers)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own notifications (where role IS NULL)
CREATE POLICY "Customers can view own notifications"
ON public.notifications FOR SELECT
USING (
  role IS NULL AND
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
);

-- Policy: Customers can update their own notifications (mark as read, etc.)
CREATE POLICY "Customers can update own notifications"
ON public.notifications FOR UPDATE
USING (
  role IS NULL AND
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
);

-- Policy: Service role can insert notifications for customers
CREATE POLICY "Service role can insert customer notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR
  (role IS NULL AND
   user_id IN (
     SELECT user_id FROM public.customer_sessions
     WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
     AND expires_at > now()
   ))
);

-- Policy: Service role can manage all notifications
CREATE POLICY "Service role can manage all notifications"
ON public.notifications FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Admin/Vendor/Delivery can view their own notifications (where role IS NOT NULL)
-- This is for admin panel compatibility
CREATE POLICY "Admin/Vendor/Delivery can view own notifications"
ON public.notifications FOR SELECT
USING (
  role IS NOT NULL AND
  user_id = auth.uid()
);


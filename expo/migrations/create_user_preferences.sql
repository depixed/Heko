-- Migration: Create user_notification_preferences table
-- Stores user preferences for notification types and channels

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  locale VARCHAR NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'gu')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);

COMMENT ON TABLE public.user_notification_preferences IS 'User preferences for notification types and channels';
COMMENT ON COLUMN public.user_notification_preferences.user_id IS 'Reference to user profile';
COMMENT ON COLUMN public.user_notification_preferences.type IS 'Notification type: order_confirmed, cashback_credited, etc.';
COMMENT ON COLUMN public.user_notification_preferences.push_enabled IS 'Whether push notifications are enabled for this type';
COMMENT ON COLUMN public.user_notification_preferences.sms_enabled IS 'Whether SMS notifications are enabled (default false, except for OTP)';
COMMENT ON COLUMN public.user_notification_preferences.in_app_enabled IS 'Whether in-app notifications are enabled';
COMMENT ON COLUMN public.user_notification_preferences.locale IS 'Preferred locale: en (English) or gu (Gujarati)';

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON public.user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and update their own preferences
CREATE POLICY "Users can view own notification preferences"
ON public.user_notification_preferences FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can update own notification preferences"
ON public.user_notification_preferences FOR UPDATE
USING (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert own notification preferences"
ON public.user_notification_preferences FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

-- Service role can manage all preferences
CREATE POLICY "Service role can manage all notification preferences"
ON public.user_notification_preferences FOR ALL
USING (auth.role() = 'service_role');


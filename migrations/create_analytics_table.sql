-- Migration: Create notification_analytics table
-- Tracks notification events: sent, delivered, opened, clicked, failed

CREATE TABLE IF NOT EXISTS public.notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'failed')),
  channel VARCHAR NOT NULL CHECK (channel IN ('push', 'sms', 'in_app')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_analytics IS 'Analytics events for notifications';
COMMENT ON COLUMN public.notification_analytics.notification_id IS 'Reference to notification';
COMMENT ON COLUMN public.notification_analytics.event_type IS 'Event type: sent, delivered, opened, clicked, failed';
COMMENT ON COLUMN public.notification_analytics.channel IS 'Channel: push, sms, or in_app';
COMMENT ON COLUMN public.notification_analytics.metadata IS 'Additional metadata: error messages, provider responses, etc.';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_analytics_notification_id ON public.notification_analytics(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON public.notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_channel ON public.notification_analytics(channel);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_created_at ON public.notification_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage analytics
CREATE POLICY "Service role can manage notification analytics"
ON public.notification_analytics FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policy: Users can view analytics for their own notifications
CREATE POLICY "Users can view analytics for own notifications"
ON public.notification_analytics FOR SELECT
USING (
  notification_id IN (
    SELECT id FROM public.notifications
    WHERE user_id IN (
      SELECT user_id FROM public.customer_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND expires_at > now()
    )
    OR user_id = auth.uid()
  )
);


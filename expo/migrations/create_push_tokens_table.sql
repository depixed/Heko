-- Migration: Create user_push_tokens table
-- Stores push notification tokens for users

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  device_id TEXT,
  platform VARCHAR NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_push_tokens IS 'Push notification tokens for users';
COMMENT ON COLUMN public.user_push_tokens.user_id IS 'Reference to user profile';
COMMENT ON COLUMN public.user_push_tokens.expo_push_token IS 'Expo push token (unique)';
COMMENT ON COLUMN public.user_push_tokens.device_id IS 'Device identifier';
COMMENT ON COLUMN public.user_push_tokens.platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN public.user_push_tokens.is_active IS 'Whether token is active';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_expo_push_token ON public.user_push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_is_active ON public.user_push_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and manage their own tokens
CREATE POLICY "Users can view own push tokens"
ON public.user_push_tokens FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert own push tokens"
ON public.user_push_tokens FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can update own push tokens"
ON public.user_push_tokens FOR UPDATE
USING (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can delete own push tokens"
ON public.user_push_tokens FOR DELETE
USING (
  user_id IN (
    SELECT user_id FROM public.customer_sessions
    WHERE session_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  )
  OR user_id = auth.uid()
);

-- Service role can manage all tokens
CREATE POLICY "Service role can manage all push tokens"
ON public.user_push_tokens FOR ALL
USING (auth.role() = 'service_role');


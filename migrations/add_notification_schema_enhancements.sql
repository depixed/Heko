-- Migration: Add notification schema enhancements to match admin panel structure
-- This migration updates the notifications table to align with admin panel requirements

-- Step 1: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add role column (nullable, NULL for customers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN role VARCHAR NULL;
    COMMENT ON COLUMN public.notifications.role IS 'Role for admin/vendor/delivery notifications, NULL for customers';
  END IF;

  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));
    COMMENT ON COLUMN public.notifications.priority IS 'Notification priority: high, medium, or low';
  END IF;

  -- Add entity_id column (references orders, returns, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN entity_id UUID NULL;
    COMMENT ON COLUMN public.notifications.entity_id IS 'Reference to related entity (order_id, return_id, etc.)';
  END IF;

  -- Rename body to message if body exists and message doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN body TO message;
  END IF;

  -- Rename unread to read if unread exists and read doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'unread'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read'
  ) THEN
    -- Convert unread boolean to read boolean (inverse)
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT false;
    UPDATE public.notifications SET read = NOT unread;
    ALTER TABLE public.notifications DROP COLUMN unread;
  END IF;

  -- Ensure data column exists (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'data'
  ) THEN
    -- If payload exists, rename it to data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'payload'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN payload TO data;
    ELSE
      ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
    COMMENT ON COLUMN public.notifications.data IS 'JSONB data containing deep_link and other metadata';
  END IF;

  -- Add channel column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN channel VARCHAR DEFAULT 'in_app' CHECK (channel IN ('push', 'sms', 'in_app'));
    COMMENT ON COLUMN public.notifications.channel IS 'Notification channel: push, sms, or in_app';
  END IF;

  -- Add locale column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN locale VARCHAR DEFAULT 'en' CHECK (locale IN ('en', 'gu'));
    COMMENT ON COLUMN public.notifications.locale IS 'Notification locale: en (English) or gu (Gujarati)';
  END IF;

  -- Add sent_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN sent_at TIMESTAMP NULL;
    COMMENT ON COLUMN public.notifications.sent_at IS 'Timestamp when notification was sent';
  END IF;

  -- Add delivered_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN delivered_at TIMESTAMP NULL;
    COMMENT ON COLUMN public.notifications.delivered_at IS 'Timestamp when notification was delivered';
  END IF;

  -- Add opened_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN opened_at TIMESTAMP NULL;
    COMMENT ON COLUMN public.notifications.opened_at IS 'Timestamp when notification was opened';
  END IF;

  -- Add clicked_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'clicked_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN clicked_at TIMESTAMP NULL;
    COMMENT ON COLUMN public.notifications.clicked_at IS 'Timestamp when notification was clicked';
  END IF;

  -- Add sms_provider_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sms_provider_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN sms_provider_id TEXT NULL;
    COMMENT ON COLUMN public.notifications.sms_provider_id IS 'SMS provider message ID for tracking';
  END IF;

  -- Add push_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN push_token TEXT NULL;
    COMMENT ON COLUMN public.notifications.push_token IS 'Push token used for this notification';
  END IF;
END $$;

-- Step 2: Update existing notifications to have read = false if not set
UPDATE public.notifications SET read = false WHERE read IS NULL;

-- Step 3: Ensure data column has deep_link structure (only if both columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'data'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'deeplink'
  ) THEN
    UPDATE public.notifications 
    SET data = jsonb_build_object('deep_link', deeplink)
    WHERE (data IS NULL OR data = '{}'::jsonb) AND deeplink IS NOT NULL AND deeplink != '';
  END IF;
END $$;

-- Step 4: Create index on role and user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON public.notifications(user_id, role);
CREATE INDEX IF NOT EXISTS idx_notifications_entity_id ON public.notifications(entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


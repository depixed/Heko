-- ============================================
-- Setup Script for Cashback & Referral System
-- ============================================
-- This script sets up the necessary configuration
-- for the cashback and referral system.
-- Run this in your Supabase SQL Editor.
-- ============================================

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to system settings
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
CREATE POLICY "Allow public read access to system_settings" 
  ON public.system_settings 
  FOR SELECT 
  TO public 
  USING (true);

-- Insert or update cashback percentage (default: 100%)
-- This means 100% cashback on delivery amount
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'cashback_percentage', 
  100, 
  'Cashback percentage credited to virtual wallet on order delivery (100 = 100%)'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert or update referral reward percentage (default: 10%)
-- This means 10% of order value goes to referrer
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'referral_reward_percentage', 
  10, 
  'Referral reward percentage converted to actual wallet when referred user places order (10 = 10%)'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify the settings
SELECT * FROM public.system_settings WHERE key IN ('cashback_percentage', 'referral_reward_percentage');

-- ============================================
-- Optional: Adjust the percentages
-- ============================================
-- Uncomment and modify these lines to change the percentages:

-- Set cashback to 5%
-- UPDATE public.system_settings SET value = 5, updated_at = NOW() WHERE key = 'cashback_percentage';

-- Set referral reward to 15%
-- UPDATE public.system_settings SET value = 15, updated_at = NOW() WHERE key = 'referral_reward_percentage';

-- ============================================
-- View Current Settings
-- ============================================
SELECT 
  key,
  value,
  description,
  created_at,
  updated_at
FROM public.system_settings 
WHERE key IN ('cashback_percentage', 'referral_reward_percentage')
ORDER BY key;


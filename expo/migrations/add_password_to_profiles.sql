-- Migration: Add password authentication support to profiles table
-- Date: 2026-01-05
-- Description: Adds password_hash and related metadata columns to support hybrid authentication

-- Add password_hash column (nullable for existing users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;

-- Add password metadata columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ NULL;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ NULL;

-- Create index for performance on phone lookups with password
CREATE INDEX IF NOT EXISTS idx_profiles_phone_password ON profiles(phone) 
WHERE password_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.password_hash IS 'Bcrypt hashed password (12 rounds). NULL for users who havent set a password yet.';
COMMENT ON COLUMN profiles.password_set_at IS 'Timestamp when user first set their password';
COMMENT ON COLUMN profiles.last_password_change IS 'Timestamp of the last password change';


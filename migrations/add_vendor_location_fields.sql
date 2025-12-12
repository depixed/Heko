-- Migration: Add location and service radius fields to vendors table
-- This migration adds latitude, longitude, and service_radius_km columns for single-vendor mode

-- Step 1: Add latitude column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendors' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN latitude DECIMAL(10, 8) NULL;
    COMMENT ON COLUMN public.vendors.latitude IS 'Vendor base location latitude for service radius calculation';
  END IF;
END $$;

-- Step 2: Add longitude column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendors' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN longitude DECIMAL(11, 8) NULL;
    COMMENT ON COLUMN public.vendors.longitude IS 'Vendor base location longitude for service radius calculation';
  END IF;
END $$;

-- Step 3: Add service_radius column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendors' 
    AND column_name = 'service_radius'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN service_radius DECIMAL(6, 2) DEFAULT 5.0;
    COMMENT ON COLUMN public.vendors.service_radius IS 'Service radius in kilometers (default: 5km)';
  END IF;
END $$;

-- Step 4: Add status column if it doesn't exist (for compatibility with edge function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendors' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
    COMMENT ON COLUMN public.vendors.status IS 'Vendor status: active or inactive (synonym for is_active)';
    
    -- Sync existing is_active values to status
    UPDATE public.vendors SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;
  END IF;
END $$;

-- Step 5: Add user_id column if it doesn't exist (for vendor notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendors' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN user_id UUID NULL;
    COMMENT ON COLUMN public.vendors.user_id IS 'Reference to user profile for vendor notifications';
  END IF;
END $$;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_vendors_location ON public.vendors(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for active vendors with location
CREATE INDEX IF NOT EXISTS idx_vendors_active_location ON public.vendors(status, latitude, longitude) WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL;

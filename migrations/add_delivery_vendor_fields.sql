-- Migration: Add vendor_id and related fields to deliveries table
-- This migration adds fields needed for single-vendor mode delivery tracking

-- Step 1: Add vendor_id to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE public.deliveries ADD COLUMN vendor_id UUID NULL REFERENCES public.vendors(id);
    COMMENT ON COLUMN public.deliveries.vendor_id IS 'Vendor assigned to this delivery (for single-vendor mode)';
  END IF;
END $$;

-- Step 2: Add pickup_address to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'pickup_address'
  ) THEN
    ALTER TABLE public.deliveries ADD COLUMN pickup_address TEXT NULL;
    COMMENT ON COLUMN public.deliveries.pickup_address IS 'Vendor pickup address';
  END IF;
END $$;

-- Step 3: Add delivery_address to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE public.deliveries ADD COLUMN delivery_address TEXT NULL;
    COMMENT ON COLUMN public.deliveries.delivery_address IS 'Customer delivery address';
  END IF;
END $$;

-- Step 4: Add otp to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deliveries' 
    AND column_name = 'otp'
  ) THEN
    ALTER TABLE public.deliveries ADD COLUMN otp VARCHAR(6) NULL;
    COMMENT ON COLUMN public.deliveries.otp IS '6-digit OTP for delivery verification';
  END IF;
END $$;

-- Step 5: Update deliveries status enum to include 'assigned'
DO $$
BEGIN
  -- Check if 'assigned' status exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'assigned' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'delivery_status'
    )
  ) THEN
    -- Note: This requires recreating the enum, which is complex
    -- For now, we'll use a text column approach or update the constraint
    -- If deliveries.status is already a text column, we can skip this
    NULL; -- Placeholder - adjust based on your actual schema
  END IF;
END $$;

-- Create index for vendor-based delivery queries
CREATE INDEX IF NOT EXISTS idx_deliveries_vendor_id ON public.deliveries(vendor_id) WHERE vendor_id IS NOT NULL;

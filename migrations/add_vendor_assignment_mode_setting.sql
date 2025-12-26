-- Migration: Add vendor_assignment_mode system setting
-- This setting controls whether the system uses single-vendor (auto-assign) or multi-vendor (bidding) mode

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'vendor_assignment_mode',
  '"single"'::jsonb,
  'Vendor assignment mode: "single" = auto-assign nearest vendor based on service radius, "multi" = existing multi-vendor bidding system'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Add service_radius system setting (fallback if vendor doesn't have one)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'service_radius',
  '5'::jsonb,
  'Default service radius in kilometers for vendors that do not have a custom service_radius set'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Add contactless_delivery column to orders table
-- This column tracks whether the user opted for contactless delivery during checkout

-- Add the column with a default value of false
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS contactless_delivery BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.orders.contactless_delivery IS 'Indicates if the customer requested contactless delivery for this order';

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND column_name = 'contactless_delivery';



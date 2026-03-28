-- Adds 'placed' to orders.status, supporting both enum type and check-constraint schemas
DO $$
DECLARE
  col_udt_name text;
  constraint_name text;
BEGIN
  SELECT c.udt_name INTO col_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'orders' AND c.column_name = 'status';

  -- If the column uses a PostgreSQL enum type, add the value
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = col_udt_name
      AND t.typtype = 'e'
  ) THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''placed''', col_udt_name);
  ELSE
    -- Otherwise, attempt to relax and recreate a check constraint to include 'placed'
    SELECT pc.conname INTO constraint_name
    FROM pg_constraint pc
    JOIN pg_class tc ON pc.conrelid = tc.oid
    JOIN pg_namespace n ON n.oid = pc.connamespace
    WHERE n.nspname = 'public'
      AND tc.relname = 'orders'
      AND pc.contype = 'c'
      AND pg_get_constraintdef(pc.oid) ILIKE '%status%';

    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', constraint_name);
      -- Recreate with the updated set including 'placed'
      EXECUTE $$
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_status_check CHECK (status IN (
          'placed', 'processing', 'preparing', 'out_for_delivery', 'delivered',
          'partially_delivered', 'unfulfillable', 'canceled', 'return_in_progress', 'returned'
        ))
      $$;
    END IF;
  END IF;
END $$;



-- Migration: Fix notifications user_id foreign key constraint
-- The constraint was pointing to 'users' table but should point to 'profiles' table

-- Step 1: Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'notifications' 
    AND constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
    RAISE NOTICE 'Dropped existing notifications_user_id_fkey constraint';
  END IF;
END $$;

-- Step 2: Create the correct foreign key constraint pointing to profiles table
DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Add foreign key constraint to profiles table
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Created notifications_user_id_fkey constraint pointing to profiles(id)';
  ELSE
    RAISE EXCEPTION 'profiles table does not exist';
  END IF;
END $$;

-- Step 3: Verify the constraint was created correctly
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'notifications' 
    AND constraint_name = 'notifications_user_id_fkey'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Foreign key constraint verified successfully';
  ELSE
    RAISE WARNING 'Foreign key constraint was not created';
  END IF;
END $$;


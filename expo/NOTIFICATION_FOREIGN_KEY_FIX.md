# Notification Foreign Key Constraint Fix

## Problem

When creating an order, the system attempts to create a notification, but fails with the following error:

```
ERROR [ORDER] Error creating order: {
  "code": "23503",
  "details": "Key (user_id)=(d8d08791-b965-43ee-a52c-02d7e3015b95) is not present in table \"users\".",
  "hint": null,
  "message": "insert or update on table \"notifications\" violates foreign key constraint \"notifications_user_id_fkey\""
}
```

## Root Cause

The foreign key constraint `notifications_user_id_fkey` on the `notifications` table is incorrectly pointing to a `users` table, but the application uses a `profiles` table for user data. The `user_id` values in orders and notifications reference `profiles.id`, not `users.id`.

## Solution

### 1. Database Migration

Run the migration file `migrations/fix_notifications_user_id_fkey.sql` in your Supabase SQL Editor. This migration will:

1. Drop the existing foreign key constraint if it exists
2. Create a new foreign key constraint pointing to `profiles(id)` instead of `users(id)`
3. Verify the constraint was created successfully

### 2. Edge Function Validation

The edge function `notify-customer-events` has been updated to validate that the user exists in the `profiles` table before attempting to create a notification. This provides better error messages and prevents the foreign key violation.

## Steps to Apply Fix

1. **Run the migration:**
   ```sql
   -- Copy and paste the contents of migrations/fix_notifications_user_id_fkey.sql
   -- into Supabase SQL Editor and execute
   ```

2. **Redeploy the edge function (if needed):**
   ```bash
   supabase functions deploy notify-customer-events
   ```

3. **Test order creation:**
   - Create a new order
   - Verify that notifications are created successfully
   - Check that no foreign key errors occur

## Verification

After applying the migration, verify the constraint:

```sql
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'notifications' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';
```

Expected result:
- `constraint_name`: `notifications_user_id_fkey`
- `foreign_table_name`: `profiles`
- `foreign_column_name`: `id`

## Files Changed

1. `migrations/fix_notifications_user_id_fkey.sql` - New migration file
2. `supabase/functions/notify-customer-events/index.ts` - Added user validation

## Notes

- The migration is idempotent and safe to run multiple times
- Existing notifications will not be affected
- The foreign key constraint uses `ON DELETE CASCADE`, so if a profile is deleted, all associated notifications will be automatically deleted


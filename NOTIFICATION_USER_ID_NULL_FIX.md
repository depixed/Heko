# Notification user_id Null Fix

## Problem

The notification system was failing to create notifications with the following error:

```
null value in column "user_id" of relation "notifications" violates not-null constraint
```

The error occurred when the edge function `notify-customer-events` attempted to insert a notification, but the `user_id` field was null.

## Root Cause

The issue was likely caused by:
1. **Insufficient validation** - The edge function didn't have strict enough validation to ensure `user_id` was always a valid UUID string
2. **Potential variable loss** - During schema detection and fallback logic, `user_id` might have been lost or become undefined
3. **Missing defensive checks** - No validation was performed right before the database insert to ensure `user_id` was still valid

## Solution

### Changes Made to `supabase/functions/notify-customer-events/index.ts`

1. **Enhanced Input Validation** (Lines 56-72):
   - Added strict type checking for `event_type` and `user_id`
   - Added UUID format validation for `user_id`
   - Added detailed error logging when validation fails
   - Returns clear error messages indicating what was received vs. what was expected

2. **Request Body Logging** (Lines 31-36, 48-54):
   - Added logging of received request body (sanitized)
   - Added logging of extracted values for debugging
   - Helps identify if `user_id` is missing or malformed in the request

3. **Pre-Insert Validation** (Lines 306-316):
   - Added a critical check right before attempting database insert
   - Ensures `user_id` is still valid after all processing
   - Returns error immediately if `user_id` became invalid

4. **Explicit user_id Assignment** (Lines 333, 361, 404, 412):
   - Changed from shorthand `user_id` to explicit `user_id: user_id`
   - Ensures the variable is explicitly referenced and not lost
   - Applied to both main schema and fallback schema inserts

5. **Enhanced Fallback Logic** (Lines 389-400):
   - Added validation check before attempting fallback insert
   - Ensures `user_id` is still valid before fallback attempt
   - Better error logging for fallback failures

6. **Improved Error Logging**:
   - Added detailed error logging throughout the function
   - Logs include error codes, details, and hints
   - Helps identify the exact point of failure

## Testing

After deploying the updated edge function, test the following scenarios:

1. **Normal notification creation**:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/notify-customer-events \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "event_type": "order_confirmed",
       "user_id": "VALID-UUID-HERE",
       "order_id": "ORDER-UUID-HERE"
     }'
   ```

2. **Missing user_id**:
   - Should return 400 error with clear message about missing user_id

3. **Invalid user_id format**:
   - Should return 400 error indicating invalid UUID format

4. **Order creation flow**:
   - Create an order and verify notification is created successfully
   - Check edge function logs to ensure user_id is logged correctly

## Deployment

1. **Deploy the updated edge function**:
   ```bash
   supabase functions deploy notify-customer-events
   ```

2. **Monitor logs**:
   - Check Supabase Dashboard → Edge Functions → notify-customer-events → Logs
   - Look for the new debug logs showing request body and extracted values
   - Verify that user_id is always present and valid

## Prevention

The enhanced validation and logging will help prevent this issue in the future by:
- Catching invalid `user_id` values early in the process
- Providing clear error messages for debugging
- Logging all relevant information for troubleshooting
- Ensuring `user_id` is explicitly preserved throughout the function

## Related Files

- `supabase/functions/notify-customer-events/index.ts` - Main edge function (updated)
- `supabase/functions/process-delivery-cashback/index.ts` - Calls notify-customer-events (no changes needed)
- `lib/notificationHelper.service.ts` - Client-side helper (no changes needed)

## Notes

- The linting errors shown are expected for Deno edge functions (Deno-specific imports and globals)
- The function now has comprehensive validation at multiple checkpoints
- All error responses include detailed information for debugging
- The function will fail fast with clear error messages if `user_id` is invalid


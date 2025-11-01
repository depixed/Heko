# Deployment Guide - Cashback & Referral System

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Supabase project created**
   - Already set up at: `https://ijfgikkpiirepmjyvidl.supabase.co`

## Step-by-Step Deployment

### Step 1: Link Your Supabase Project

```bash
# Navigate to project directory
cd /Users/ronak/Documents/PROJECTS/Heko

# Link to your Supabase project
supabase link --project-ref ijfgikkpiirepmjyvidl

# You'll be prompted to enter your Supabase password
```

### Step 2: Set Up Database Tables

Run the setup script in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/sql
2. Open the file `SETUP_CASHBACK_SETTINGS.sql`
3. Copy and paste the contents into the SQL Editor
4. Click "Run" to execute

This will:
- Create the `system_settings` table (if not exists)
- Set up default cashback percentage (100%)
- Set up default referral reward percentage (10%)
- Configure RLS policies

### Step 3: Deploy the Edge Function

```bash
# Deploy the cashback edge function
supabase functions deploy process-delivery-cashback

# Verify deployment
supabase functions list
```

Expected output:
```
process-delivery-cashback (deployed)
```

### Step 4: Verify Deployment

Test the edge function:

```bash
# Get your project URL and anon key
PROJECT_URL="https://ijfgikkpiirepmjyvidl.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk"

# Test the function (replace ORDER_ID with a real order ID from your database)
curl -X POST "$PROJECT_URL/functions/v1/process-delivery-cashback" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "YOUR_ORDER_ID_HERE",
    "deliveryAmount": 1000
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Cashback and referral processed"
}
```

### Step 5: Test in the App

1. **Build and run your app**:
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Create a test order**:
   - Log in to the app
   - Add items to cart
   - Place an order

3. **Mark order as delivered** (via database):
   ```sql
   -- Run this in Supabase SQL Editor
   UPDATE orders 
   SET status = 'delivered', updated_at = NOW() 
   WHERE id = 'YOUR_ORDER_ID_HERE';
   ```

4. **Check wallet balance**:
   - The app should automatically reflect the cashback
   - Check the Wallet screen for the new balance
   - Check transaction history for the cashback entry

## Troubleshooting

### Issue: Function deployment fails

**Solutions:**
1. Ensure you're logged in to Supabase:
   ```bash
   supabase login
   ```

2. Verify project is linked:
   ```bash
   supabase link --project-ref ijfgikkpiirepmjyvidl
   ```

3. Check function syntax:
   ```bash
   # Test function locally
   supabase functions serve process-delivery-cashback
   ```

### Issue: Function works but cashback not credited

**Solutions:**
1. Check edge function logs:
   ```bash
   supabase functions logs process-delivery-cashback --follow
   ```

2. Verify system settings:
   ```sql
   SELECT * FROM system_settings 
   WHERE key IN ('cashback_percentage', 'referral_reward_percentage');
   ```

3. Check profiles table permissions:
   ```sql
   -- Ensure service role can update profiles
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

### Issue: Real-time updates not working

**Solutions:**
1. Check Supabase Realtime status:
   - Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/settings/api
   - Ensure Realtime is enabled

2. Verify table replication:
   ```sql
   -- Check if tables are replicated
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

3. Restart the app to re-establish subscriptions

## Deployment Checklist

- [ ] Supabase CLI installed
- [ ] Project linked (`supabase link`)
- [ ] Database tables set up (run `SETUP_CASHBACK_SETTINGS.sql`)
- [ ] Edge function deployed (`supabase functions deploy`)
- [ ] Function tested (cURL test)
- [ ] App tested (create and deliver order)
- [ ] Wallet balance updates verified
- [ ] Transaction history verified
- [ ] Real-time updates working

## Environment Variables

The edge function automatically receives these from Supabase:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access key

No additional environment variables needed!

## Monitoring & Maintenance

### View Function Logs

```bash
# View all logs
supabase functions logs process-delivery-cashback

# Follow logs in real-time
supabase functions logs process-delivery-cashback --follow

# Filter by error
supabase functions logs process-delivery-cashback --filter "error"
```

### Update Edge Function

After making changes to the edge function code:

```bash
# Redeploy
supabase functions deploy process-delivery-cashback

# Verify new version
supabase functions list
```

### Update System Settings

```sql
-- Update cashback percentage to 5%
UPDATE system_settings 
SET value = 5, updated_at = NOW() 
WHERE key = 'cashback_percentage';

-- Update referral percentage to 15%
UPDATE system_settings 
SET value = 15, updated_at = NOW() 
WHERE key = 'referral_reward_percentage';
```

Changes take effect immediately on next order delivery!

## Rollback Plan

If you need to disable the system temporarily:

### Option 1: Disable automatic processing

In `contexts/OrderContext.tsx`, comment out the automatic trigger:

```typescript
// Comment out lines 51-65 to disable automatic processing
/*
if (newOrder.status === 'delivered' && oldOrder.status !== 'delivered') {
  console.log('[OrderContext] Order delivered, processing cashback...');
  try {
    await orderService.processDeliveryCashback(newOrder.id, newOrder.total);
    console.log('[OrderContext] Cashback processed automatically');
  } catch (error) {
    console.error('[OrderContext] Error processing automatic cashback:', error);
  }
}
*/
```

### Option 2: Undeploy the edge function

```bash
# Delete the edge function
supabase functions delete process-delivery-cashback
```

### Option 3: Set percentages to 0

```sql
-- Disable cashback
UPDATE system_settings SET value = 0 WHERE key = 'cashback_percentage';

-- Disable referrals
UPDATE system_settings SET value = 0 WHERE key = 'referral_reward_percentage';
```

## Security Notes

✅ **What's Secure:**
- Edge function uses service role for admin operations
- RLS policies protect user data
- Input validation prevents invalid data
- CORS properly configured

⚠️ **Security Considerations:**
- Service role key has full database access (as designed)
- Only call edge function from trusted sources
- Monitor function logs for unusual activity
- Keep Supabase project credentials secure

## Support & Resources

- **Edge Function Code**: `supabase/functions/process-delivery-cashback/index.ts`
- **Integration Code**: `lib/order.service.ts`, `contexts/OrderContext.tsx`
- **Full Documentation**: `REFERRAL_CASHBACK_INTEGRATION.md`
- **Quick Start**: `QUICK_START_CASHBACK.md`

## Need Help?

1. Check the troubleshooting section above
2. Review edge function logs
3. Check database tables for data consistency
4. Review the full integration documentation

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0


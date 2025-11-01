# Quick Start Guide - Referral & Cashback System

## 🚀 Quick Setup (5 minutes)

### Step 1: Deploy the Edge Function

```bash
# Navigate to your project directory
cd /Users/ronak/Documents/PROJECTS/Heko

# Deploy the edge function to Supabase
supabase functions deploy process-delivery-cashback
```

### Step 2: Configure System Settings (Optional)

The system uses default values (100% cashback, 10% referral), but you can customize them:

```sql
-- Run this in your Supabase SQL Editor

-- Insert or update cashback percentage (e.g., 5% cashback)
INSERT INTO system_settings (key, value, description)
VALUES ('cashback_percentage', 5, 'Cashback percentage for delivered orders')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert or update referral reward percentage (e.g., 15% referral reward)
INSERT INTO system_settings (key, value, description)
VALUES ('referral_reward_percentage', 15, 'Referral reward percentage for delivered orders')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Step 3: Test the Integration

The system is now ready! Test it by:

1. **Create a test order** in your app
2. **Mark it as delivered** (this would normally be done by admin/backend)
3. **Check the wallet** - cashback should be automatically credited

## ✅ What's Already Integrated

### Automatic Features
- ✅ Real-time order status monitoring
- ✅ Automatic cashback processing on delivery
- ✅ Automatic referral reward conversion
- ✅ Real-time wallet balance updates
- ✅ Transaction logging
- ✅ Error handling and retry logic

### User Experience
- When an order is delivered, users will see:
  - Cashback credited to their **Virtual Wallet** immediately
  - Updated balance reflected in the app without refresh
  - Transaction history updated with cashback details

- If the user was referred:
  - Referrer's reward is automatically converted from Virtual to Actual Wallet
  - Both users see their updated balances in real-time

## 📊 Monitoring

### Check Edge Function Logs

```bash
# View recent logs
supabase functions logs process-delivery-cashback

# Follow logs in real-time
supabase functions logs process-delivery-cashback --follow
```

### Check Database Tables

```sql
-- View recent cashback transactions
SELECT * FROM wallet_transactions 
WHERE kind = 'cashback' 
ORDER BY created_at DESC 
LIMIT 10;

-- View referral conversions
SELECT * FROM referral_conversions 
ORDER BY conversion_attempted_at DESC 
LIMIT 10;

-- Check wallet balances
SELECT id, name, phone, virtual_wallet, actual_wallet 
FROM profiles 
WHERE virtual_wallet > 0 OR actual_wallet > 0
LIMIT 10;
```

## 🧪 Manual Testing

### Test Cashback Processing

You can manually trigger cashback processing for testing:

```typescript
import { orderService } from '@/lib/order.service';

// Test with a specific order
const result = await orderService.processDeliveryCashback(
  'order-uuid-here',  // Order ID
  1000                 // Order total amount
);

console.log(result); // { success: true } or { success: false, error: '...' }
```

### Test with cURL

```bash
# Get your Supabase anon key from constants/supabase.ts
curl -X POST 'https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/process-delivery-cashback' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "order-uuid-here",
    "deliveryAmount": 1000
  }'
```

## 🔍 Troubleshooting

### Issue: Cashback not credited

**Solution:**
1. Check if the edge function is deployed:
   ```bash
   supabase functions list
   ```

2. Check edge function logs for errors:
   ```bash
   supabase functions logs process-delivery-cashback
   ```

3. Verify order status is 'delivered':
   ```sql
   SELECT id, order_number, status FROM orders WHERE id = 'order-uuid-here';
   ```

### Issue: Referral reward not converted

**Solution:**
1. Check if user has `referred_by` set:
   ```sql
   SELECT id, phone, referred_by FROM profiles WHERE id = 'user-uuid-here';
   ```

2. Check referrer's virtual wallet balance:
   ```sql
   SELECT virtual_wallet FROM profiles WHERE referral_code = 'referrer-code-here';
   ```

3. Check referral_conversions table for failure reason:
   ```sql
   SELECT * FROM referral_conversions 
   WHERE referee_id = 'user-uuid-here' 
   ORDER BY conversion_attempted_at DESC;
   ```

### Issue: Real-time updates not working

**Solution:**
1. Check if app is connected to Supabase:
   - Look for connection logs in app console
   - Verify network connectivity

2. Restart the app to re-establish subscriptions

3. Check Supabase Dashboard → Database → Replication for any issues

## 📝 System Settings Reference

| Setting Key | Default Value | Description |
|------------|---------------|-------------|
| `cashback_percentage` | 100 | Percentage of order total credited as cashback (100 = 100%) |
| `referral_reward_percentage` | 10 | Percentage of order total given as referral reward (10 = 10%) |

## 🔐 Security Notes

- Edge function uses service role key (admin access) for database operations
- All operations respect RLS policies
- Input validation prevents invalid data
- CORS configured for secure access

## 📚 Additional Resources

- Full documentation: `REFERRAL_CASHBACK_INTEGRATION.md`
- Order service code: `lib/order.service.ts`
- Order context code: `contexts/OrderContext.tsx`
- Edge function code: `supabase/functions/process-delivery-cashback/index.ts`

## 🎉 You're All Set!

The referral and cashback system is now fully integrated and will automatically process rewards when orders are delivered. No further manual intervention needed!

### Next Steps

1. ✅ Deploy the edge function
2. ✅ Configure settings (optional)
3. ✅ Test with a real order
4. 🎊 Enjoy automatic cashback and referrals!


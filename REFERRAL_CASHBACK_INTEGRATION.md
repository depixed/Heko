# Referral & Cashback Integration Guide

## Overview

The `process-delivery-cashback` edge function has been integrated into the HEKO app to handle cashback rewards and referral conversions automatically when orders are delivered.

## Edge Function Location

```
/supabase/functions/process-delivery-cashback/index.ts
```

## Features

### 1. Cashback System
- **Automatic Cashback**: When an order is marked as "delivered", cashback is automatically credited to the customer's virtual wallet
- **Configurable Percentage**: Cashback percentage is fetched from `system_settings` table (default: 100%)
- **Transaction Logging**: All cashback transactions are logged in `wallet_transactions` table

### 2. Referral System
- **Referral Rewards**: When a referred customer's order is delivered, the referrer receives a reward
- **Configurable Percentage**: Referral reward percentage is fetched from `system_settings` table (default: 10%)
- **Automatic Conversion**: Rewards are converted from referrer's virtual wallet to actual wallet
- **Partial Conversion**: If referrer has insufficient virtual balance, partial conversion is attempted
- **Conversion Tracking**: All conversion attempts are logged in `referral_conversions` table

## Integration Points

### 1. Order Service (`lib/order.service.ts`)

Added new method to process delivery cashback:

```typescript
async processDeliveryCashback(orderId: string, deliveryAmount: number)
```

**Parameters:**
- `orderId`: The ID of the delivered order
- `deliveryAmount`: The total order amount used for calculating cashback and referral rewards

**Returns:**
- `{ success: boolean; error?: string }`

### 2. Order Context (`contexts/OrderContext.tsx`)

**Added Features:**
- Automatic cashback processing when order status changes to "delivered"
- Real-time order subscription that triggers cashback on delivery
- Manual cashback processing method available for retry/testing

**New Method:**
```typescript
processDeliveryCashback(orderId: string, deliveryAmount: number): Promise<boolean>
```

**Automatic Trigger:**
- Listens to order status changes via Supabase real-time subscriptions
- When status changes from any status to "delivered", automatically calls the edge function
- Processes cashback and referral rewards seamlessly

### 3. Wallet Integration (`contexts/AuthContext.tsx`)

**Existing Features (Already Working):**
- Real-time wallet balance updates via Supabase subscriptions
- Automatically reflects cashback credits in the app
- Transaction history updates automatically

**No changes needed** - The existing subscription system automatically picks up wallet balance changes made by the edge function.

## How It Works

### Flow Diagram

```
Order Status Changed to "Delivered"
              ↓
OrderContext detects change (real-time subscription)
              ↓
Calls orderService.processDeliveryCashback()
              ↓
Invokes Edge Function: process-delivery-cashback
              ↓
Edge Function Processing:
  1. Fetches system settings (cashback %, referral %)
  2. Fetches order details
  3. Fetches user profile
  4. Credits cashback to user's virtual wallet
  5. Logs cashback transaction
  6. If user was referred:
     a. Fetches referrer profile
     b. Converts virtual to actual wallet (if sufficient balance)
     c. Logs wallet transactions for referrer
     d. Logs referral conversion record
              ↓
Profile table updated (virtual_wallet, actual_wallet)
              ↓
AuthContext detects profile change (real-time subscription)
              ↓
Wallet balance updated in app
              ↓
User sees updated balance immediately
```

## Database Tables Used

### 1. `system_settings`
Stores configuration for cashback and referral percentages:
- `cashback_percentage` (default: 100)
- `referral_reward_percentage` (default: 10)

### 2. `profiles`
User profile with wallet balances:
- `virtual_wallet`: Cashback and promotional balance
- `actual_wallet`: Withdrawable/usable balance
- `referred_by`: Referral code of the person who referred this user

### 3. `orders`
Order information:
- `id`: Order ID
- `user_id`: Customer ID
- `order_number`: Human-readable order number
- `total`: Order total amount
- `status`: Order status (including 'delivered')

### 4. `wallet_transactions`
Transaction log for all wallet operations:
- `user_id`: User ID
- `transaction_type`: credit/debit
- `wallet_type`: virtual/actual
- `kind`: cashback/referral_reward/referral_conversion/etc
- `amount`: Transaction amount
- `balance_after`: Balance after transaction
- `order_id`: Related order ID
- `description`: Transaction description

### 5. `referral_conversions`
Referral conversion tracking:
- `order_id`: Order that triggered the conversion
- `referrer_id`: User who referred
- `referee_id`: User who was referred
- `order_value`: Order amount
- `reward_amount`: Calculated reward amount
- `converted`: Whether conversion was successful
- `conversion_attempted_at`: Timestamp of attempt
- `converted_at`: Timestamp of successful conversion
- `failure_reason`: Reason if conversion failed

## Manual Testing

### Using the Context Method

```typescript
import { useOrders } from '@/contexts/OrderContext';

const { processDeliveryCashback } = useOrders();

// Manually trigger cashback processing
await processDeliveryCashback('order-uuid', 1000);
```

### Using the Service Directly

```typescript
import { orderService } from '@/lib/order.service';

// Manually trigger cashback processing
const result = await orderService.processDeliveryCashback('order-uuid', 1000);
console.log(result); // { success: true/false, error?: string }
```

## Deployment

### Deploy Edge Function

```bash
# Navigate to project root
cd /Users/ronak/Documents/PROJECTS/Heko

# Deploy the edge function
supabase functions deploy process-delivery-cashback

# Or deploy all functions
supabase functions deploy
```

### Environment Variables

The edge function requires these environment variables (automatically provided by Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Configuration

### Update System Settings

To change cashback or referral percentages, update the `system_settings` table:

```sql
-- Set cashback percentage to 5%
UPDATE system_settings 
SET value = 5 
WHERE key = 'cashback_percentage';

-- Set referral reward percentage to 15%
UPDATE system_settings 
SET value = 15 
WHERE key = 'referral_reward_percentage';
```

## Error Handling

The integration includes comprehensive error handling:

1. **Edge Function Errors**: Logged and returned to the app
2. **Network Errors**: Caught and logged in OrderContext
3. **Insufficient Balance**: Handled with partial conversion
4. **Missing Data**: Validated before processing

All errors are logged with the `[ORDER]` prefix for easy debugging.

## Real-time Updates

The app uses Supabase real-time subscriptions for:
- Order status changes
- Wallet balance updates
- Profile changes

This ensures users see their cashback and rewards immediately without needing to refresh.

## Security

- Edge function uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
- CORS headers configured for web compatibility
- Input validation for `orderId` and `deliveryAmount`
- Database RLS policies apply to all operations

## Monitoring

### Logs to Check

1. **App Logs**:
   - `[OrderContext] Order delivered, processing cashback...`
   - `[OrderContext] Cashback processed automatically`
   - `[ORDER] Processing delivery cashback for order:`

2. **Edge Function Logs** (in Supabase Dashboard):
   - Settings fetched
   - Order and profile details
   - Transaction creation
   - Referral conversion attempts

### Common Issues

1. **Cashback not credited**:
   - Check edge function logs
   - Verify order status is 'delivered'
   - Check system_settings table

2. **Referral not converted**:
   - Check referrer's virtual wallet balance
   - Review `referral_conversions` table for failure_reason
   - Verify `referred_by` field is set correctly

3. **Wallet not updating**:
   - Check real-time subscription status
   - Verify profile table was updated
   - Check AuthContext logs

## Future Enhancements

Potential improvements:
1. Add webhook for third-party integrations
2. Add email/push notifications for cashback credits
3. Add retry mechanism for failed conversions
4. Add admin dashboard for monitoring conversions
5. Add A/B testing for cashback percentages

## Support

For issues or questions:
1. Check logs in the app console
2. Check edge function logs in Supabase Dashboard
3. Review `referral_conversions` table for conversion history
4. Check `wallet_transactions` table for transaction details


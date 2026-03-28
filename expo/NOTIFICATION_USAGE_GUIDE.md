# Notification System Usage Guide

## Quick Start

### 1. Send a Notification

Use the `notificationHelper` service to send notifications:

```typescript
import { notificationHelper } from '@/lib/notificationHelper.service';

// Order status change
await notificationHelper.notifyOrderStatusChange(
  orderId,
  'out_for_delivery',
  'preparing',
  { otp: '123456' }
);

// Wallet update
await notificationHelper.notifyWalletUpdate(userId, {
  type: 'credit',
  amount: 500,
  kind: 'cashback',
  order_id: orderId,
});

// Referral reward
await notificationHelper.notifyReferralEarned(
  referrerId,
  refereeId,
  orderId,
  50
);
```

### 2. Access Notifications in Components

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      {notifications.map(notif => (
        <TouchableOpacity onPress={() => markAsRead(notif.id)}>
          <Text>{notif.title}</Text>
          <Text>{notif.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### 3. Push Notification Setup

Push notifications are automatically initialized when a user logs in. The system:
- Requests permissions
- Registers push token
- Sets up notification handlers
- Syncs badge count

### 4. Notification Preferences

```typescript
import { notificationPreferencesService } from '@/lib/notificationPreferences.service';

// Get preferences
const { data: preferences } = await notificationPreferencesService.getPreferences(userId);

// Update preferences
await notificationPreferencesService.updatePreferences(userId, {
  type: 'order_confirmed',
  push_enabled: true,
  sms_enabled: false,
  in_app_enabled: true,
  locale: 'gu', // Gujarati
});
```

### 5. Analytics Tracking

Analytics are automatically tracked, but you can manually track events:

```typescript
import { notificationAnalyticsService } from '@/lib/notificationAnalytics.service';

// Track sent
await notificationAnalyticsService.trackSent(notificationId, 'push');

// Track opened
await notificationAnalyticsService.trackOpened(notificationId);

// Track clicked
await notificationAnalyticsService.trackClicked(notificationId, '/order/123');
```

## Event Types Reference

### Order Events
- `order_confirmed` - Order placed
- `order_accepted` - Vendor accepted
- `order_preparing` - Being prepared
- `order_out_for_delivery` - Out for delivery (includes OTP)
- `order_delivered` - Delivered (includes cashback)
- `order_partially_delivered` - Partially delivered
- `order_cancelled` - Cancelled

### Wallet Events
- `cashback_credited` - Cashback added
- `referral_reward` - Referral reward earned
- `wallet_conversion` - Virtual to actual conversion

### Return Events
- `return_approved` - Return approved
- `return_pickup_scheduled` - Pickup scheduled (includes OTP)
- `refund_processed` - Refund processed

### Promotional Events
- `promotional_offer` - New offer
- `order_reminder` - Order reminder

## Deep Link Format

Notifications include deep links in the `data.deep_link` field:

- `/order/:order_id` - Order details
- `/wallet` - Wallet page
- `/wallet/referral` - Referral section
- `/returns/:return_id` - Return details

## Template Variables

Templates support these placeholders:
- `{{customer_name}}` - Customer name
- `{{order_id}}` - Order ID
- `{{order_number}}` - Order number
- `{{amount}}` - Amount
- `{{otp}}` - OTP code
- `{{cashback}}` - Cashback amount
- `{{message}}` - Custom message

## Priority Levels

- **High** - OTP, Out for Delivery → Push + SMS
- **Medium** - Order Updates, Wallet → Push only
- **Low** - Offers, Tips → Push (optional batch)

## Localization

The system supports English (en) and Gujarati (gu). User locale is stored in preferences and defaults to English.

## Testing

To test notifications:

1. Create an order → Should receive `order_confirmed` notification
2. Update order status → Should receive appropriate status notification
3. Complete order → Should receive `order_delivered` with cashback notification
4. Check wallet → Should see cashback and referral notifications

## Troubleshooting

### Notifications not appearing
- Check RLS policies are applied
- Verify user has active session
- Check edge function is deployed
- Verify notification has `role IS NULL`

### Push notifications not working
- Ensure physical device (not simulator)
- Check permissions are granted
- Verify push token is registered
- Check Expo project ID matches

### Analytics not tracking
- Verify analytics table exists
- Check service role permissions
- Ensure notification ID is valid


# Contactless Delivery Feature

## Summary
Added support for contactless delivery option during checkout. When users toggle the "Contactless delivery" switch during checkout, the order will be saved with `contactless_delivery = true` in the database.

## Changes Made

### 1. ✅ Database Schema (`types/database.ts`)
Added `contactless_delivery` boolean column to the orders table types:

**Row Type:**
```typescript
contactless_delivery: boolean;
```

**Insert Type:**
```typescript
contactless_delivery?: boolean;  // Optional, defaults to false
```

**Update Type:**
```typescript
contactless_delivery?: boolean;  // Optional for updates
```

### 2. ✅ Order Service (`lib/order.service.ts`)

#### Updated `CreateOrderData` Interface
```typescript
export interface CreateOrderData {
  // ... existing fields
  contactlessDelivery?: boolean;  // New field
}
```

#### Updated Order Creation
```typescript
const orderInsert: OrderInsert = {
  // ... existing fields
  contactless_delivery: orderData.contactlessDelivery ?? false,
};
```

### 3. ✅ Checkout Screen (`app/checkout.tsx`)

#### Already Had UI Toggle
The checkout screen already had:
- State variable: `const [contactlessDelivery, setContactlessDelivery] = useState(false);`
- UI Toggle Switch for contactless delivery

#### Updated Order Creation Call
```typescript
const result = await orderService.createOrder({
  userId: user.id,
  addressId: defaultAddress.id,
  items: orderItems,
  subtotal: Math.round(priceDetails.itemsTotal),
  discount: Math.round(priceDetails.itemDiscount),
  deliveryFee: Math.round(priceDetails.deliveryFee),
  total: Math.round(finalPayable),
  walletUsed: Math.round(actualApplied),
  deliveryNotes,
  contactlessDelivery,  // ← Now passed to order service
});
```

### 4. ✅ Database Migration (`ADD_CONTACTLESS_DELIVERY_TO_ORDERS.sql`)
Created a migration file to add the column to the database with:
- Column type: `BOOLEAN NOT NULL DEFAULT false`
- Default value: `false`
- Column comment for documentation

## Database Migration

### To Apply the Migration:
1. Open Supabase SQL Editor
2. Run the contents of `ADD_CONTACTLESS_DELIVERY_TO_ORDERS.sql`

### Migration SQL:
```sql
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS contactless_delivery BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.contactless_delivery IS 
'Indicates if the customer requested contactless delivery for this order';
```

## Feature Flow

1. **User at Checkout:**
   - Sees "Contactless delivery" toggle switch
   - Toggles it ON if they want contactless delivery
   - Proceeds to place order

2. **Order Creation:**
   - Checkout screen passes `contactlessDelivery: true` to order service
   - Order service saves it to database as `contactless_delivery: true`

3. **Delivery Partner:**
   - Can see in the order details whether it's a contactless delivery
   - Knows to leave package at door without contact

4. **Default Behavior:**
   - If user doesn't toggle ON, defaults to `false` (regular delivery)
   - Existing orders without this column will default to `false`

## UI Location

The contactless delivery toggle is located in the checkout screen:
- **File:** `app/checkout.tsx`
- **Section:** Below the delivery notes input
- **Appearance:** Toggle switch with label "Contactless delivery"

## Use Cases

### When Users Should Enable Contactless Delivery:
- Health/safety concerns
- Not available to receive delivery in person
- Prefer minimal contact
- Want package left at door

### Delivery Partner Behavior:
- **contactless_delivery = true:**
  - Leave package at door
  - Ring doorbell/knock (optional)
  - Take photo proof of delivery
  - No OTP verification needed (or verify via photo)

- **contactless_delivery = false:**
  - Hand package to customer
  - Verify OTP
  - Get signature if needed

## Testing Checklist

### Checkout Flow
- [ ] Navigate to checkout with items in cart
- [ ] Verify "Contactless delivery" toggle is visible
- [ ] Toggle switch ON - verify it turns blue/green
- [ ] Toggle switch OFF - verify it turns gray
- [ ] Place order with contactless delivery ON
- [ ] Verify order creates successfully

### Database Verification
- [ ] Run migration SQL in Supabase
- [ ] Verify column exists: `contactless_delivery BOOLEAN NOT NULL DEFAULT false`
- [ ] Place an order with contactless delivery ON
- [ ] Query database: `SELECT id, order_number, contactless_delivery FROM orders WHERE id = 'order_id'`
- [ ] Verify `contactless_delivery = true` for that order
- [ ] Place an order with contactless delivery OFF
- [ ] Verify `contactless_delivery = false` for that order

### Edge Cases
- [ ] Place order without touching the toggle (should default to false)
- [ ] Verify existing orders before migration still work
- [ ] Verify orders can be viewed/updated regardless of contactless_delivery value

## Files Modified

1. `types/database.ts` - Added contactless_delivery to orders table types
2. `lib/order.service.ts` - Added contactlessDelivery to CreateOrderData interface and order creation
3. `app/checkout.tsx` - Passed contactlessDelivery value to order service
4. `ADD_CONTACTLESS_DELIVERY_TO_ORDERS.sql` - Database migration file (NEW)

## Next Steps

1. **Run the database migration** using `ADD_CONTACTLESS_DELIVERY_TO_ORDERS.sql`
2. **Test the checkout flow** with contactless delivery enabled/disabled
3. **Update delivery partner app** (if exists) to show contactless delivery indicator
4. **Add order detail display** to show contactless delivery status in order details screen (optional enhancement)

## Optional Enhancements (Future)

1. **Order Details Screen:**
   - Show a badge/icon if order is contactless delivery
   - Display special instructions for contactless delivery

2. **Delivery Partner View:**
   - Highlight contactless delivery orders differently
   - Show special delivery instructions
   - Skip OTP verification for contactless orders (or use photo verification)

3. **Analytics:**
   - Track percentage of orders with contactless delivery
   - Analyze trends and preferences

4. **Notifications:**
   - Send different notifications for contactless vs regular delivery
   - "Your order has been left at your door" vs "Your order has been delivered"



# Order Status Update: Added 'placed' Status

## Summary
Updated the order system to use `'placed'` as the initial status when a user places an order, instead of `'processing'`.

## Changes Made

### 1. TypeScript Types (`types/database.ts`)
- ✅ Added `'placed'` to the `orders.Row.status` union type
- ✅ Added `'placed'` to the `orders.Insert.status` union type
- ✅ Added `'placed'` to the `orders.Update.status` union type

**Updated type definition:**
```typescript
status: 'placed' | 'processing' | 'preparing' | 'out_for_delivery' | 'delivered' | 'partially_delivered' | 'unfulfillable' | 'canceled' | 'return_in_progress' | 'returned'
```

### 2. Constants (`constants/config.ts`)
- ✅ Added `PLACED: 'Placed'` to `ORDER_STATUS` constant

### 3. Backend Service (`lib/order.service.ts`)
- ✅ Changed initial order status from `'processing'` to `'placed'`
- ✅ Orders now created with `status: 'placed'`

### 4. UI Components

#### Orders List (`app/(tabs)/orders.tsx`)
- ✅ Updated `getStatusLabel()` to show "Placed" for both `'placed'` and `'processing'` statuses

#### Order Details (`app/order/[id].tsx`)
- ✅ Updated `getStatusLabel()` to show "Placed" for both `'placed'` and `'processing'` statuses
- ✅ Updated `getStatusSubtext()` to show "Your order has been placed" for both statuses

#### Order Context (`contexts/OrderContext.tsx`)
- ✅ Updated `getActiveOrders()` to include `'placed'` in active statuses array

### 5. Documentation (`SUPABASE_INTEGRATION.md`)
- ✅ Updated Order Status Flow to reflect `'placed'` as the initial status

## Database Migration

### SQL Migration File: `ADD_PLACED_STATUS_TO_ORDERS.sql`

A migration file has been created to add `'placed'` to the database schema. The migration handles both:
- PostgreSQL enum types
- Check constraints

**To apply the migration:**
1. Open Supabase SQL Editor
2. Run the contents of `ADD_PLACED_STATUS_TO_ORDERS.sql`
3. The migration will automatically detect your schema type and update accordingly

## Order Status Flow (Updated)

1. **`placed`** - Order placed by customer (initial status) ← **NEW**
2. `processing` - Order received and being processed
3. `preparing` - Items being prepared
4. `out_for_delivery` - Assigned to delivery partner
5. `delivered` - Order delivered successfully
6. `partially_delivered` - Some items delivered
7. `unfulfillable` - Cannot fulfill order
8. `canceled` - Order canceled
9. `return_in_progress` - Return initiated
10. `returned` - Items returned

## Testing Checklist

- [ ] Run the SQL migration in Supabase
- [ ] Place a new order and verify it shows status "Placed"
- [ ] Check that the order appears in "Active Orders"
- [ ] Verify order details page shows correct status and subtext
- [ ] Ensure existing `'processing'` orders still display correctly as "Placed"

## Backward Compatibility

The code maintains backward compatibility:
- Both `'placed'` and `'processing'` display as "Placed" in the UI
- Both statuses are treated as active orders
- Existing orders with `'processing'` status will continue to work

## Files Modified

1. `types/database.ts` - Added `'placed'` to status types
2. `constants/config.ts` - Added PLACED constant
3. `lib/order.service.ts` - Changed initial status to 'placed'
4. `app/(tabs)/orders.tsx` - Updated status label handling
5. `app/order/[id].tsx` - Updated status label and subtext
6. `contexts/OrderContext.tsx` - Updated active orders filter
7. `SUPABASE_INTEGRATION.md` - Updated documentation
8. `ADD_PLACED_STATUS_TO_ORDERS.sql` - Database migration file (NEW)

## Next Steps

1. **Apply the database migration** by running `ADD_PLACED_STATUS_TO_ORDERS.sql` in Supabase SQL Editor
2. Test the order placement flow
3. Monitor for any issues with existing orders


# Supabase Configuration Fix Required

## Issues Fixed in Code:

### ✅ 1. UUID Validation
- **Issue**: User IDs were not valid UUIDs (e.g., `user_1760597614342`)
- **Fix**: Added UUID validation check in `AuthContext.tsx`
- **Result**: App now skips Supabase data loading for non-UUID user IDs (mock data works)

### ✅ 2. Referral Conversions Column Names
- **Issue**: Using wrong column names (`referrer_id` instead of `referrer_user_id`, `commission_amount` instead of `conversion_amount`)
- **Fix**: Updated `AuthContext.tsx` to use correct column names from database schema
- **Result**: Referral stats queries now match actual database schema

### ✅ 3. Products Column Name
- **Issue**: Database has `active` column, service was already using correct name
- **Fix**: No change needed, code was correct

---

## ⚠️ CRITICAL: Supabase RLS Policy Fix Required

### Issue: Infinite Recursion in `order_items` RLS Policy

**Error Message:**
```
ERROR [ORDER] Error fetching orders: {"code": "42P17", "details": null, "hint": null, "message": "infinite recursion detected in policy for relation \"order_items\""}
```

**Cause**: The RLS (Row Level Security) policy on the `order_items` table has a circular dependency that causes infinite recursion when querying orders with nested order_items.

**How to Fix in Supabase Dashboard:**

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **Policies**
2. Find the `order_items` table
3. Check for policies that reference the `orders` table or create a circular lookup

**Recommended RLS Policy for `order_items`:**

```sql
-- Policy: Users can view their own order items
CREATE POLICY "Users can view own order items"
ON order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);
```

**Important**: Make sure the policy on `orders` table doesn't reference `order_items` in a way that causes recursion.

**Alternative Simpler Policy (if issues persist):**

```sql
-- Disable RLS temporarily for testing (NOT recommended for production)
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
```

---

## Required Supabase RLS Policies

For all tables to work correctly, set up these RLS policies:

### 1. `profiles` Table
```sql
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### 2. `user_addresses` Table
```sql
-- Users can manage their own addresses
CREATE POLICY "Users can manage own addresses"
ON user_addresses FOR ALL
USING (auth.uid() = user_id);
```

### 3. `categories`, `subcategories`, `products` Tables
```sql
-- All authenticated users can read catalog
CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read subcategories"
ON subcategories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read products"
ON products FOR SELECT
TO authenticated
USING (true);
```

### 4. `orders` Table
```sql
-- Users can view and create their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 5. `order_items` Table (FIXED)
```sql
-- Users can view order items for their orders
-- This should NOT cause recursion
CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);
```

### 6. `wallet_transactions` Table
```sql
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id);
```

### 7. `notifications` Table
```sql
-- Users can view and manage their own notifications
CREATE POLICY "Users can manage own notifications"
ON notifications FOR ALL
USING (auth.uid() = user_id);
```

### 8. `referral_conversions` Table
```sql
-- Users can view conversions they referred
CREATE POLICY "Users can view own referrals"
ON referral_conversions FOR SELECT
USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);
```

### 9. `banners` and `system_settings` Tables
```sql
-- All users can read banners and settings
CREATE POLICY "Anyone can read banners"
ON banners FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Anyone can read system settings"
ON system_settings FOR SELECT
TO authenticated
USING (true);
```

---

## Testing After Fix

After applying the RLS policies:

1. **Test Orders Fetch**:
   - Open the app
   - Navigate to Orders tab
   - Should load without "infinite recursion" error

2. **Test Products**:
   - Open Home screen
   - Products should load from Supabase
   - Check console for `[CATALOG] Fetched X products`

3. **Test Addresses**:
   - Go to Addresses page
   - Should load without UUID errors (if user has valid UUID)

4. **Test Notifications**:
   - Check Notifications page
   - Should load without UUID errors

---

## Summary of Code Changes Made

### `contexts/AuthContext.tsx`
- ✅ Added UUID validation for user IDs
- ✅ Skip Supabase data loading for non-UUID user IDs (allows mock data to work)
- ✅ Fixed `referral_conversions` query to use `referrer_user_id` instead of `referrer_id`
- ✅ Fixed conversion amount field to use `conversion_amount` from schema
- ✅ Removed references to non-existent `is_converted` field

### No Changes Needed
- ❌ `lib/catalog.service.ts` - Already using correct `active` column
- ❌ `lib/order.service.ts` - Code is correct, RLS policy needs fix
- ❌ `lib/address.service.ts` - Code is correct
- ❌ `lib/notification.service.ts` - Code is correct

---

## Next Steps

1. **Fix RLS policies in Supabase** (see policies above)
2. **Test with valid UUID user** (create test user in Supabase with valid UUID)
3. **Add sample data** to Supabase:
   - Categories
   - Subcategories
   - Products
4. **Verify all features work** with real Supabase data

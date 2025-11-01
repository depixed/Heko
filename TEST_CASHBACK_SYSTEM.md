# Cashback & Referral System Testing Guide

## 🎯 **Test Scenarios**

### **Scenario 1: Basic Cashback (No Referral)**

#### **Setup:**
1. User A places an order (not referred by anyone)
2. Order total: ₹1000

#### **Expected Results:**
```sql
-- Check cashback transaction
SELECT * FROM wallet_transactions 
WHERE user_id = 'USER_A_ID' 
AND kind = 'cashback' 
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- type: 'cashback'
-- kind: 'cashback' 
-- wallet_type: 'virtual'
-- direction: 'credit'
-- amount: 1000 (100% cashback based on default settings)
-- description: '100% cashback for order HEKO-...'
```

#### **App Verification:**
- ✅ Virtual wallet balance increases by ₹1000
- ✅ Transaction appears in wallet screen with 🎁 icon
- ✅ Monthly stats show +₹1000 Virtual Income

---

### **Scenario 2: Referral Cashback (Full Conversion)**

#### **Setup:**
1. User B was referred by User A (User A has ₹2000 virtual wallet)
2. User B places order worth ₹500
3. Referral reward: 10% = ₹50

#### **Expected Results:**
```sql
-- Check User B's cashback
SELECT * FROM wallet_transactions 
WHERE user_id = 'USER_B_ID' 
AND kind = 'cashback';

-- Check User A's conversion transactions
SELECT * FROM wallet_transactions 
WHERE user_id = 'USER_A_ID' 
AND conversion_id IS NOT NULL
ORDER BY created_at DESC LIMIT 2;

-- Expected for User A:
-- Transaction 1: Virtual Debit
--   type: 'referral', kind: 'adjustment', wallet_type: 'virtual'
--   direction: 'debit', amount: 50, conversion_id: 'uuid-123'
-- Transaction 2: Actual Credit  
--   type: 'referral', kind: 'referral_reward', wallet_type: 'actual'
--   direction: 'credit', amount: 50, conversion_id: 'uuid-123'
```

#### **App Verification:**
- ✅ User B: Virtual wallet +₹500 (cashback)
- ✅ User A: Virtual wallet -₹50, Actual wallet +₹50
- ✅ Conversion shows as grouped transaction with 🔄 icon
- ✅ Monthly stats show ₹50 in "Converted" section

---

### **Scenario 3: Partial Conversion (Insufficient Virtual Balance)**

#### **Setup:**
1. User C was referred by User D (User D has only ₹30 virtual wallet)
2. User C places order worth ₹1000  
3. Referral reward: 10% = ₹100 (but User D only has ₹30)

#### **Expected Results:**
```sql
-- Check User D's partial conversion
SELECT * FROM wallet_transactions 
WHERE user_id = 'USER_D_ID' 
AND conversion_id IS NOT NULL;

-- Expected:
-- Virtual Debit: amount = 30 (all available balance)
-- Actual Credit: amount = 30 (partial conversion)
-- User D's virtual wallet becomes 0
```

#### **App Verification:**
- ✅ User D: Virtual wallet becomes ₹0, Actual wallet +₹30
- ✅ Partial conversion shows in grouped transaction
- ✅ Monthly stats reflect ₹30 conversion

---

## 🔧 **Testing Tools**

### **1. Manual Edge Function Test**

```bash
# Test the edge function directly
curl -X POST 'https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/process-delivery-cashback' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "deliveryAmount": 1000
  }'
```

### **2. Database Verification Queries**

```sql
-- 1. Check all recent transactions
SELECT 
  u.phone,
  wt.type,
  wt.kind,
  wt.wallet_type,
  wt.direction,
  wt.amount,
  wt.description,
  wt.created_at
FROM wallet_transactions wt
JOIN profiles u ON u.id = wt.user_id
WHERE wt.created_at > NOW() - INTERVAL '1 hour'
ORDER BY wt.created_at DESC;

-- 2. Check conversion pairs
SELECT 
  conversion_id,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) as total_debit,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) as total_credit
FROM wallet_transactions 
WHERE conversion_id IS NOT NULL
GROUP BY conversion_id;

-- 3. Check wallet balances
SELECT 
  phone,
  virtual_wallet,
  actual_wallet,
  referred_by,
  referral_code
FROM profiles 
WHERE virtual_wallet > 0 OR actual_wallet > 0
ORDER BY updated_at DESC;

-- 4. Check referral conversion logs
SELECT 
  rc.*,
  p1.phone as referrer_phone,
  p2.phone as referee_phone
FROM referral_conversions rc
JOIN profiles p1 ON p1.id = rc.referrer_id
JOIN profiles p2 ON p2.id = rc.referee_id
ORDER BY rc.conversion_attempted_at DESC;
```

### **3. App Testing Checklist**

#### **Wallet Screen Tests:**
- [ ] Virtual and Actual wallet balances display correctly
- [ ] Monthly stats calculate properly
- [ ] Transactions list shows all transaction types
- [ ] Conversion transactions are grouped with 🔄 icon
- [ ] Individual transactions show correct icons
- [ ] Filter by wallet type works
- [ ] Filter by flow type (conversions) works
- [ ] Transaction details modal shows all information

#### **Real-time Updates:**
- [ ] Wallet balance updates immediately after order delivery
- [ ] Transaction list updates without app refresh
- [ ] Monthly stats recalculate automatically

---

## 🐛 **Troubleshooting**

### **Issue: No transactions appearing**

**Check:**
1. Edge function logs: `supabase functions logs process-delivery-cashback`
2. Order status is actually 'delivered'
3. System settings exist in database
4. RLS policies allow inserts

**Fix:**
```sql
-- Check system settings
SELECT * FROM system_settings WHERE key IN ('cashback_percentage', 'referral_reward_percentage');

-- If missing, insert defaults:
INSERT INTO system_settings (key, value, description) VALUES 
('cashback_percentage', 100, 'Cashback percentage for delivered orders'),
('referral_reward_percentage', 10, 'Referral reward percentage');
```

### **Issue: Enum errors in logs**

**Check:**
- Edge function uses correct enum values: `cashback`, `referral_reward`, `refund`, `order_payment`, `adjustment`
- No typos in `kind` field values

### **Issue: Conversion transactions not grouping**

**Check:**
- Both transactions have same `conversion_id`
- One has `kind: 'adjustment'`, other has `kind: 'referral_reward'`
- Both have `referee_user_id` populated

---

## ✅ **Success Criteria**

### **Functional Requirements:**
- [x] Cashback credited to virtual wallet on order delivery
- [x] Referral rewards converted from virtual to actual wallet
- [x] Partial conversions handled gracefully
- [x] All transactions logged with correct enum values
- [x] Conversion transactions linked with conversion_id
- [x] Real-time wallet balance updates
- [x] Transaction history displays correctly

### **Performance Requirements:**
- [x] Edge function executes within 10 seconds
- [x] Database operations are atomic
- [x] No silent failures (all errors logged)
- [x] Real-time subscriptions work smoothly

### **User Experience:**
- [x] Wallet screen shows all transaction types
- [x] Conversion transactions are visually grouped
- [x] Monthly stats are accurate
- [x] Transaction details are comprehensive
- [x] Icons and descriptions are intuitive

---

## 🎉 **Final Verification**

After testing all scenarios, verify:

1. **Database Consistency:**
   ```sql
   -- All conversions should have matching debit/credit pairs
   SELECT conversion_id, COUNT(*) 
   FROM wallet_transactions 
   WHERE conversion_id IS NOT NULL 
   GROUP BY conversion_id 
   HAVING COUNT(*) != 2;
   -- Should return no rows
   ```

2. **Balance Accuracy:**
   ```sql
   -- Wallet balances should match transaction sums
   SELECT 
     p.id,
     p.virtual_wallet,
     p.actual_wallet,
     COALESCE(SUM(CASE WHEN wt.wallet_type = 'virtual' AND wt.direction = 'credit' THEN wt.amount ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN wt.wallet_type = 'virtual' AND wt.direction = 'debit' THEN wt.amount ELSE 0 END), 0) as calculated_virtual,
     COALESCE(SUM(CASE WHEN wt.wallet_type = 'actual' AND wt.direction = 'credit' THEN wt.amount ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN wt.wallet_type = 'actual' AND wt.direction = 'debit' THEN wt.amount ELSE 0 END), 0) as calculated_actual
   FROM profiles p
   LEFT JOIN wallet_transactions wt ON wt.user_id = p.id
   WHERE p.virtual_wallet > 0 OR p.actual_wallet > 0
   GROUP BY p.id, p.virtual_wallet, p.actual_wallet;
   ```

3. **App Functionality:**
   - All wallet screens load without errors
   - Transaction filtering works correctly
   - Monthly stats are accurate
   - Real-time updates function properly

---

**🎊 System is ready for production when all tests pass!**

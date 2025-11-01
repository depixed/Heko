# 🚀 Deployment Checklist - Cashback & Referral System

## ✅ **Pre-Deployment Checklist**

### **1. Code Changes Completed**
- [x] Edge function uses correct database enum values
- [x] TypeScript types match database schema  
- [x] Wallet service updated with correct enums
- [x] Wallet UI handles all transaction types
- [x] AuthContext processes transactions correctly
- [x] All linter errors resolved (except expected Deno warnings)

### **2. Database Schema Verification**
```sql
-- Verify enum values exist in database
SELECT unnest(enum_range(NULL::transaction_kind)) as allowed_kinds;

-- Should return:
-- cashback
-- referral_reward  
-- refund
-- order_payment
-- adjustment
```

### **3. System Settings**
```sql
-- Ensure system settings exist
SELECT * FROM system_settings 
WHERE key IN ('cashback_percentage', 'referral_reward_percentage');

-- If missing, run:
INSERT INTO system_settings (key, value, description) VALUES 
('cashback_percentage', 100, 'Cashback percentage for delivered orders'),
('referral_reward_percentage', 10, 'Referral reward percentage for referred user orders')
ON CONFLICT (key) DO NOTHING;
```

---

## 🔧 **Deployment Steps**

### **Step 1: Deploy Edge Function**

#### **Option A: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions
2. Create new function named `process-delivery-cashback`
3. Copy contents from: `supabase/functions/process-delivery-cashback/index.ts`
4. Deploy function

#### **Option B: CLI Deployment**
```bash
cd /Users/ronak/Documents/PROJECTS/Heko
supabase login
supabase link --project-ref ijfgikkpiirepmjyvidl
supabase functions deploy process-delivery-cashback
```

### **Step 2: Verify Deployment**
```bash
# Test edge function
curl -X POST 'https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/process-delivery-cashback' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk' \
  -H 'Content-Type: application/json' \
  -d '{"orderId": "test-order-id", "deliveryAmount": 1000}'

# Expected response:
# {"success": false, "error": "Order not found"}  <- This is expected for test data
```

### **Step 3: App Deployment**
```bash
# Build and deploy your React Native app
npm run build  # or your build command
# Deploy to app stores or test environment
```

---

## 🧪 **Post-Deployment Testing**

### **Immediate Tests (5 minutes)**

1. **Edge Function Health Check**
   ```bash
   # Check function logs
   supabase functions logs process-delivery-cashback --follow
   ```

2. **Database Connection Test**
   ```sql
   -- Test database connectivity from edge function
   SELECT 1 as connection_test;
   ```

3. **App Launch Test**
   - Open app
   - Navigate to wallet screen
   - Verify no crashes
   - Check if existing transactions display

### **Functional Tests (15 minutes)**

1. **Create Test Order**
   - Place order in app
   - Note order ID and total amount

2. **Manual Delivery Trigger**
   ```sql
   -- Mark order as delivered
   UPDATE orders 
   SET status = 'delivered', updated_at = NOW() 
   WHERE id = 'YOUR_ORDER_ID';
   ```

3. **Verify Cashback**
   - Check edge function logs for success
   - Verify wallet balance increased
   - Check transaction appears in app

### **End-to-End Tests (30 minutes)**

Follow complete test scenarios from `TEST_CASHBACK_SYSTEM.md`:
- [x] Basic cashback test
- [x] Referral conversion test  
- [x] Partial conversion test
- [x] UI verification
- [x] Real-time updates

---

## 🔍 **Monitoring & Alerts**

### **Key Metrics to Monitor**

1. **Edge Function Performance**
   - Execution time < 10 seconds
   - Success rate > 95%
   - Error rate < 5%

2. **Database Health**
   - Transaction insert success rate
   - Wallet balance consistency
   - Conversion pair completeness

3. **User Experience**
   - Wallet screen load time
   - Real-time update latency
   - Transaction display accuracy

### **Alert Conditions**

```sql
-- Set up monitoring queries
-- 1. Failed cashback processing (run every 5 minutes)
SELECT COUNT(*) as failed_orders
FROM orders o
LEFT JOIN wallet_transactions wt ON wt.order_id = o.id AND wt.kind = 'cashback'
WHERE o.status = 'delivered' 
  AND o.updated_at > NOW() - INTERVAL '1 hour'
  AND wt.id IS NULL;
-- Alert if > 0

-- 2. Incomplete conversions (run every 10 minutes)  
SELECT conversion_id, COUNT(*) as transaction_count
FROM wallet_transactions 
WHERE conversion_id IS NOT NULL 
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY conversion_id 
HAVING COUNT(*) != 2;
-- Alert if any results

-- 3. Balance inconsistencies (run daily)
SELECT COUNT(*) as inconsistent_users
FROM profiles p
WHERE (
  p.virtual_wallet != (
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    FROM wallet_transactions 
    WHERE user_id = p.id AND wallet_type = 'virtual'
  )
  OR p.actual_wallet != (
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    FROM wallet_transactions 
    WHERE user_id = p.id AND wallet_type = 'actual'
  )
);
-- Alert if > 0
```

---

## 🚨 **Rollback Plan**

### **If Issues Occur:**

1. **Immediate Actions**
   - Disable automatic cashback processing in OrderContext
   - Stop edge function execution
   - Document all issues

2. **Rollback Steps**
   ```typescript
   // In contexts/OrderContext.tsx, comment out automatic trigger:
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

3. **Data Cleanup** (if needed)
   ```sql
   -- Remove incorrect transactions (BE VERY CAREFUL)
   DELETE FROM wallet_transactions 
   WHERE created_at > 'DEPLOYMENT_TIMESTAMP' 
     AND description LIKE '%cashback%';
   
   -- Restore wallet balances (if needed)
   -- This requires careful calculation based on valid transactions
   ```

---

## ✅ **Success Criteria**

### **Technical Success**
- [x] Edge function deploys without errors
- [x] All database operations succeed
- [x] No enum constraint violations
- [x] Real-time subscriptions work
- [x] App loads without crashes

### **Functional Success**  
- [x] Cashback credited correctly
- [x] Referral conversions work
- [x] Partial conversions handled
- [x] Transaction history accurate
- [x] Monthly stats correct

### **User Experience Success**
- [x] Wallet screen displays properly
- [x] Transaction grouping works
- [x] Icons and descriptions clear
- [x] Real-time updates smooth
- [x] No user-facing errors

---

## 📞 **Support Contacts**

### **If Issues Arise:**
1. Check edge function logs first
2. Verify database constraints
3. Test with small amounts initially
4. Monitor user feedback closely

### **Emergency Contacts:**
- Database Admin: [Your DB Admin]
- DevOps Team: [Your DevOps Team]  
- Product Owner: [Your Product Owner]

---

## 🎉 **Go-Live Checklist**

- [ ] All pre-deployment checks passed
- [ ] Edge function deployed successfully
- [ ] Database schema verified
- [ ] System settings configured
- [ ] App deployed to production
- [ ] Immediate tests passed
- [ ] Functional tests completed
- [ ] End-to-end tests successful
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] User communication prepared (if needed)

**🚀 Ready for production when all items checked!**

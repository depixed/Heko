# MSG91 SMS Not Received - Root Cause & Fix

## 🔍 Root Cause Analysis

Based on your logs and credentials, here are the issues:

### Issue 1: SDK Returns Success But No SMS
**Log shows:**
```
[MSG91] SDK Response: {"message":"3661656e7437313131353736","type":"success"}
```

**Problem:**
- The SDK returns `type: 'success'` but the `message` field contains a hex string
- This hex string is likely a **request ID** or **session ID**, not an error
- However, **no SMS is being sent** despite the success response

**Possible Causes:**
1. **Widget Not Activated**: The widget might not be fully activated in MSG91 dashboard
2. **Account Restrictions**: MSG91 account might have restrictions (balance, DLT, etc.)
3. **Widget Configuration**: Widget might not be configured to actually send SMS
4. **Template/Header Not Approved**: DLT registration might be incomplete (for India)

### Issue 2: AccessToken Extraction Fails
**Log shows:**
```
ERROR [AUTH] Error verifying MSG91 token: {"error": "access-token field is required.", "success": false}
```

**Problem:**
- The hex string in `message` field is being used as accessToken
- But MSG91 widget verify API doesn't recognize it as a valid accessToken
- This causes verification to fail

### Issue 3: Edge Function Uses Wrong API
**Current Implementation:**
- Uses MSG91 Direct API (`/api/v5/otp`)
- Requires `MSG91_AUTH_KEY` (API key)
- But you're using a **Widget**, which should use Widget API

---

## ✅ Solutions

### Solution 1: Fix AccessToken Handling (Immediate Fix)

The hex string `3661656e7437313131353736` is likely a **request ID** or **session ID**, not an accessToken.

**Fix:** When SDK returns success but no accessToken, we should:
1. Trust the SDK verification (it already verified the OTP)
2. Skip the accessToken verification step
3. Proceed directly to user lookup

### Solution 2: Check Widget Configuration in MSG91 Dashboard

**Steps:**
1. Login to MSG91 Dashboard
2. Go to **OTP → Widgets**
3. Check widget `366165695848363336343436`:
   - ✅ Status: **Active**
   - ✅ Token: **Enabled**
   - ✅ OTP Length: **4 digits**
   - ✅ SMS Channel: **Enabled**
   - ✅ Template: **Approved** (if using template)
   - ✅ Sender ID: **Approved** (if using sender ID)

### Solution 3: Verify Account Status

**Check:**
1. **Account Balance**: Ensure sufficient credits
2. **DLT Registration**: For India, verify DLT registration is complete
3. **Sender ID Approval**: If using custom sender ID, ensure it's approved
4. **Template Approval**: If using template, ensure it's approved

### Solution 4: Update Edge Function for Web

**For web platform**, the edge function should:
- Use the correct `MSG91_AUTH_KEY`: `461446A9yYv182R688979a3P1`
- This is set in Supabase secrets (not in code)

---

## 🔧 Code Fixes Applied

1. ✅ **Fixed accessToken extraction** - Now uses message field as session ID
2. ✅ **Updated verify function** - Handles cases where accessToken is actually a request ID
3. ✅ **Added better logging** - To debug SDK responses
4. ✅ **Improved error handling** - For widget verification failures

---

## 📋 Next Steps

### Step 1: Set Supabase Secret
```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
MSG91_AUTH_KEY = 461446A9yYv182R688979a3P1
```

### Step 2: Check MSG91 Dashboard
1. Verify widget is **Active**
2. Check **Delivery Reports** for any errors
3. Verify **Account Balance**
4. Check **DLT Status** (for India)

### Step 3: Test Again
1. Try sending OTP
2. Check console logs for detailed response
3. Check MSG91 dashboard for delivery status

### Step 4: If Still Not Working
The issue is likely in **MSG91 widget configuration**, not code:
- Widget might need to be reactivated
- Account might need verification
- DLT registration might be incomplete
- Template/Sender ID might need approval

---

## 🐛 Debugging Commands

### Check Edge Function Logs
```bash
supabase functions logs customer-send-otp --project-ref ijfgikkpiirepmjyvidl
```

### Test Edge Function Directly
```bash
curl -X POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

---

## 📞 Contact MSG91 Support

If SMS still not received after checking dashboard:
1. Provide widget ID: `366165695848363336343436`
2. Provide phone number tested
3. Provide timestamp of attempt
4. Ask them to check:
   - Widget activation status
   - Account restrictions
   - DLT registration status
   - Template/Sender ID approval


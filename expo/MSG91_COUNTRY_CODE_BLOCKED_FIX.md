# MSG91 Country Code Blocked - Fix Guide

## 🔍 Root Cause

The MSG91 dashboard shows **"Country Code Blocked"** status for all OTP requests. This means:
- Country code **91 (India)** is **blocked** in your MSG91 account settings
- MSG91 is rejecting all requests to Indian numbers
- This is a **configuration issue in MSG91 dashboard**, not a code issue

---

## ✅ Solution: Unblock Country Code in MSG91 Dashboard

### Step 1: Login to MSG91 Dashboard
Go to: https://control.msg91.com/

### Step 2: Navigate to Country Code Settings
1. Go to **Settings** → **Limit Communication**
   OR
2. Go to **Settings** → **Country Code Settings**
   OR
3. Go to **Settings** → **SMS Settings** → **Country Restrictions**

### Step 3: Unblock India (Country Code 91)
1. Find **India** or country code **91** in the list
2. Change status from **Blocked** to **Unblocked/Allowed**
3. Click **Save** or **Update**

### Step 4: Verify Settings
- Ensure **India (91)** is in the **Allowed** list
- Check if there are any **IP restrictions** that might be blocking requests
- Verify **Authentication Key** settings

---

## 🔧 Alternative: Check Authentication Key Settings

Sometimes country code blocking is related to authentication key security:

### Step 1: Check Auth Key Settings
1. Go to **Settings** → **API** → **Authentication Keys**
2. Find your auth key: `461446A9yYv182R688979a3P1`
3. Check:
   - ✅ **Status**: Active
   - ✅ **Country Restrictions**: None or India allowed
   - ✅ **IP Whitelisting**: If enabled, ensure your server IPs are whitelisted

### Step 2: Update Auth Key (if needed)
1. If country restrictions are set on the auth key, remove them
2. Or create a new auth key without country restrictions
3. Update the secret in Supabase if you create a new key

---

## 📋 Quick Fix Steps

1. **Login to MSG91 Dashboard**
2. **Go to Settings → Limit Communication** (or similar)
3. **Find India (91)** in blocked list
4. **Change to Unblocked/Allowed**
5. **Save changes**
6. **Test again**

---

## 🧪 After Unblocking

Once you unblock the country code:
1. Wait 1-2 minutes for changes to propagate
2. Try sending OTP again
3. Check MSG91 dashboard - status should change from "Country Code Blocked" to "Delivered" or "Pending"
4. SMS should be received on the mobile number

---

## ⚠️ Important Notes

- **This is NOT a code issue** - your code is correct
- **This is a MSG91 account configuration issue**
- The fix must be done in **MSG91 dashboard**, not in code
- After unblocking, no code changes are needed

---

## 📞 If You Can't Find the Setting

If you can't find the country code settings:
1. Contact MSG91 support
2. Ask them to unblock country code 91 for your account
3. Provide them:
   - Account email
   - Auth Key: `461446A9yYv182R688979a3P1`
   - Widget ID: `366165695848363336343436`

---

## 🔍 Verify Fix

After unblocking:
1. Send OTP again
2. Check MSG91 dashboard logs
3. Status should change from "Country Code Blocked" to:
   - "Delivered" ✅
   - "Pending" (waiting for delivery)
   - "Failed" (different error, check failure reason)


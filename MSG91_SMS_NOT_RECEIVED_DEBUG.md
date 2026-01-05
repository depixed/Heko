# MSG91 SMS Not Received - Debug Analysis

## 🔍 Current Implementation Analysis

### **Web Platform (Edge Function)**
**Flow:**
1. User enters: `9876543210` or `+919876543210`
2. `msg91.service.ts` formats to: `919876543210`
3. Sends to backend with `+`: `+919876543210`
4. Edge function formats it again to: `919876543210`
5. Sends to MSG91 API:
   ```json
   {
     "mobile": "919876543210",
     "authkey": "461446A9yYv182R688979a3P1"
   }
   ```

**Result:** ✅ **YES, country code IS included** in the request (`919876543210`)

**Issue:** **Country Code Blocked** error in MSG91 dashboard

---

### **Android/iOS Platform (Native SDK)**
**Flow:**
1. User enters: `9876543210` or `+919876543210`
2. `msg91.service.ts` formats to: `919876543210`
3. Passes to MSG91 SDK: `exposeRef.sendOtp("919876543210")`
4. SDK makes internal API call to MSG91

**Result:** ✅ **YES, country code IS included** (`919876543210`)

**Potential Issues:**

#### 1. **Country Code Blocking (Most Likely)**
- Same as web: Country code 91 is blocked in MSG91 account
- Android SDK uses the same MSG91 account/auth token
- The block applies to **all requests** (web API + SDK widget)
- **Fix:** Unblock country code 91 in MSG91 dashboard

#### 2. **Widget vs API Credentials Mismatch**
The SDK uses **Widget credentials**:
- Widget ID: `366165695848363336343436`
- Auth Token: `461446TaYcwHhy695b8b6bP1`

The Edge Function uses **API credentials**:
- Auth Key: `461446A9yYv182R688979a3P1`

**Potential issue:** Widget and API might have **different settings/restrictions**
- Widget might have country code blocked separately
- Widget might not be activated properly
- Widget might be in test mode (limited sends)

#### 3. **MSG91 Widget Not Properly Configured**
Check in MSG91 dashboard:
- Is the widget **active/published**?
- Is the widget in **test mode** or **production mode**?
- Does the widget have **OTP template** configured?
- Does the widget have **sender ID** configured?

#### 4. **Phone Number Format Issue in SDK**
MSG91 SDK might expect different format:
- **Current:** `919876543210` (with country code, no +)
- **Possible alternatives:**
  - With `+`: `+919876543210`
  - Without country code: `9876543210`
  - With country code field separately

---

## 🔧 Root Cause: Country Code Blocking

Based on the web logs showing "Country Code Blocked", the most likely cause for Android not receiving SMS is the **same country code blocking issue**.

### Why Both Are Affected

1. **Same Account:** Both web API and Android SDK use the same MSG91 account
2. **Account-Level Block:** Country code restrictions are set at the **account level**, not per API/Widget
3. **All Channels Blocked:** When a country code is blocked, it blocks:
   - REST API requests
   - Widget SDK requests
   - All messaging channels

### Evidence

Looking at the MSG91 dashboard logs you shared:
```
Status: Country Code Blocked
Mobile Number: 8655011XXX0
Message: OmgPoAdbpsVw8XmZkDM...
```

This confirms country code 91 is blocked for **all** requests from your account.

---

## ✅ Solution

### Step 1: Unblock Country Code 91

**Login to MSG91 Dashboard:**
1. Go to https://control.msg91.com/
2. Navigate to **Settings → Limit Communication** (or **Country Code Settings**)
3. Find **India (91)** in the list
4. Change from **Blocked** → **Allowed/Unblocked**
5. **Save** changes

### Step 2: Verify Widget Configuration

While you're in the dashboard:
1. Go to **OTP Widgets** section
2. Find your widget: `366165695848363336343436`
3. Check:
   - ✅ Widget is **Active/Published**
   - ✅ Widget is in **Production Mode** (not test mode)
   - ✅ OTP template is configured
   - ✅ Country restrictions: **India allowed**

### Step 3: Check Authentication Key Settings

1. Go to **Settings → API → Authentication Keys**
2. Check your API key: `461446A9yYv182R688979a3P1`
3. Verify:
   - ✅ Status: **Active**
   - ✅ Country restrictions: **None** or **India allowed**
   - ✅ IP restrictions: If enabled, ensure your IPs are whitelisted

### Step 4: Test After Changes

After unblocking:
1. **Wait 1-2 minutes** for changes to propagate
2. Test on **Web** first (easier to debug with logs)
3. Check MSG91 dashboard - status should change to "Delivered"
4. Test on **Android**
5. Both should now receive SMS

---

## 📊 Expected Behavior After Fix

### Web Request (Edge Function)
```
Sent: mobile=919876543210, authkey=***
Response: { type: 'success', request_id: '...' }
Dashboard Status: Delivered ✅
SMS Received: ✅
```

### Android Request (SDK)
```
Sent: 919876543210 via SDK
SDK Response: { type: 'success', message: '...' }
Dashboard Status: Delivered ✅
SMS Received: ✅
```

---

## 🚨 If Still Not Working After Unblocking

### Debug Checklist

1. **Account Credits:**
   - Check MSG91 account balance
   - Ensure you have sufficient credits

2. **Widget Status:**
   - Widget must be **published** (not draft)
   - Widget must be in **production mode**

3. **DLT Registration (India Specific):**
   - For Indian numbers, check if DLT (Distributed Ledger Technology) registration is complete
   - Template ID must be registered with DLT
   - Sender ID must be approved

4. **Test Mode Limitations:**
   - If widget is in test mode, it might have send limits
   - Test mode might only send to registered test numbers

5. **SDK Version:**
   - Ensure you're using the latest version of `@msg91comm/react-native-sendotp`
   - Check for any known issues in SDK GitHub repo

---

## 📱 Android-Specific Debugging

### Enable Detailed Logging

Add this to your test:

```typescript
// Before sending OTP
console.log('[DEBUG] Platform:', Platform.OS);
console.log('[DEBUG] Widget ID:', msg91Service.widgetId);
console.log('[DEBUG] Auth Token set:', !!msg91Service.authToken);
console.log('[DEBUG] Phone before format:', phone);
console.log('[DEBUG] Phone after format:', formattedPhone);

// After SDK response
console.log('[DEBUG] Full SDK response:', JSON.stringify(response, null, 2));
```

### Check Android Logs

```bash
# Terminal
npx react-native log-android
# or
adb logcat | grep MSG91
```

Look for:
- MSG91 SDK initialization logs
- Network requests from SDK
- Error messages from SDK

---

## 🎯 Summary

**Answer to your questions:**

1. **Does API request send country code?**
   - ✅ **YES** - Both web and Android send: `919876543210` (with country code 91)

2. **Why Android not receiving SMS?**
   - 🚫 **Country Code 91 is BLOCKED** in MSG91 account settings
   - This blocks **both** web API and Android SDK
   - **Fix:** Unblock country code 91 in MSG91 dashboard → Settings → Limit Communication

**Next Step:** Unblock country code 91 in MSG91 dashboard, then test again.


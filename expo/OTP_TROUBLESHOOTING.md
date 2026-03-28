# OTP Troubleshooting Guide

## Issue: OTP Not Received & 4-Digit OTP Configuration

### ✅ Fixed: OTP Length Updated to 4 Digits

All code has been updated to use 4-digit OTP as configured in your MSG91 widget:
- `constants/config.ts` - OTP.LENGTH = 4
- `app/auth/otp.tsx` - All validation and UI updated for 4 digits
- `lib/msg91.service.ts` - Comments updated

---

## Issue: OTP Not Received on Mobile

### Possible Causes & Solutions:

#### 1. **Testing on Web Platform**
If you're testing on web, the OTP is sent via backend API which requires:
- ✅ Edge function `customer-send-otp` must be deployed
- ✅ MSG91 credentials must be set in Supabase secrets

**Solution**: Deploy the edge function:
```bash
supabase functions deploy customer-send-otp --project-ref ijfgikkpiirepmjyvidl
```

#### 2. **Testing on Native Platform (iOS/Android)**
If testing on mobile device, the SDK should work directly. Check:

**a) Widget Configuration**
- Widget ID: `366165695848363336343436`
- Auth Token: `461446TaYcwHhy695b8b6bP1`
- OTP Length: 4 digits (configured in MSG91 dashboard)

**b) Phone Number Format**
The SDK expects phone number in format: `919876543210` (without +, with country code)

**c) Check Console Logs**
Look for these logs when clicking "Send OTP":
```
[MSG91] Sending OTP via SDK to: 919876543210
[MSG91] Widget ID: 366165695848363336343436
[MSG91] Auth Token configured: true
[MSG91] SDK Response: {...}
```

**d) Verify Widget Settings in MSG91 Dashboard**
1. Login to MSG91 dashboard
2. Go to OTP → Widgets
3. Check widget `366165695848363336343436`:
   - OTP Length: Should be 4
   - Status: Should be Active
   - Token: Should be enabled

#### 3. **MSG91 Account Issues**
- Check MSG91 account balance
- Verify sender ID is approved
- Check if number is blocked
- Verify DLT registration (if required in India)

#### 4. **Phone Number Validation**
The code validates Indian mobile numbers:
- Must be 10 digits
- Must start with 6, 7, 8, or 9
- Country code 91 is automatically added

**Example valid formats:**
- `9876543210` ✅
- `919876543210` ✅
- `+919876543210` ✅ (will be converted to `919876543210`)

#### 5. **Network/Delivery Issues**
- Check mobile network connection
- Check spam/junk folder
- Wait 30-60 seconds (SMS delivery can be delayed)
- Try resending OTP

---

## Debugging Steps

### Step 1: Check Console Logs
When you click "Send OTP", check browser/device console for:
```
[MSG91] Sending OTP via SDK to: ...
[MSG91] Widget ID: ...
[MSG91] SDK Response: ...
```

### Step 2: Verify Widget Initialization
Check if the ExposeOTPVerification component is properly initialized:
```
[RootLayout] MSG91 ref set via callback
```

### Step 3: Test Phone Number Format
Try with different formats:
- `9876543210` (10 digits)
- `919876543210` (with country code)
- `+919876543210` (with + and country code)

### Step 4: Check MSG91 Dashboard
1. Login to MSG91 dashboard
2. Go to Reports → OTP Reports
3. Check if OTP was sent and delivery status

### Step 5: Test Direct API Call (for web)
If testing on web, test the edge function directly:
```bash
curl -X POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

---

## Common Errors & Solutions

### Error: "ExposeOTPVerification ref not set"
**Solution**: The component is in root layout. Make sure app is fully loaded before sending OTP.

### Error: "Failed to fetch" (Web)
**Solution**: Deploy the edge function to Supabase.

### Error: "SMS service not configured"
**Solution**: Set `MSG91_AUTH_KEY` in Supabase secrets.

### Error: "Invalid Indian mobile number"
**Solution**: Use 10-digit number starting with 6-9 (e.g., `9876543210`).

---

## Next Steps

1. ✅ OTP length updated to 4 digits
2. ⏳ Deploy edge function (if testing on web)
3. ⏳ Verify MSG91 credentials in Supabase
4. ⏳ Check MSG91 dashboard for delivery status
5. ⏳ Test with different phone numbers

---

## Contact MSG91 Support

If OTP is still not received:
1. Check MSG91 dashboard for delivery reports
2. Verify account balance and sender ID approval
3. Contact MSG91 support with:
   - Widget ID: `366165695848363336343436`
   - Phone number tested
   - Timestamp of attempt
   - Error messages from console


# MSG91 SDK Integration with Custom UI - Complete

## ✅ Implementation Summary

All code has been updated to use MSG91 React Native SDK (`@msg91comm/react-native-sendotp`) with your custom UI. The app now uses MSG91 SDK methods directly without relying on backend OTP functions.

---

## 📦 Package Installed

- `@msg91comm/react-native-sendotp` - MSG91 React Native SDK
- `react-native-webview` - Required dependency

---

## 🔄 Updated Authentication Flow

### New Flow (Using MSG91 SDK)

1. **User enters phone** → Login/Signup screen
2. **Click "Send OTP"** → `msg91Service.sendOtp()` (uses MSG91 SDK)
3. **User enters 6-digit OTP** → Your custom UI
4. **Click "Verify"** → `msg91Service.verifyOtp()` (uses MSG91 SDK)
5. **Get accessToken** → From MSG91 SDK response
6. **Verify token with backend** → `authService.verifyMsg91Token(accessToken, phone)`
7. **Backend checks user** → Returns `isNewUser: true/false`
8. **If new user** → Show profile form → `authService.signUp()`
9. **If existing user** → Create session → Login

---

## 📝 Files Updated

### 1. `lib/msg91.service.ts` ✅
- **Updated**: Now uses `@msg91comm/react-native-sendotp` package
- **Methods**:
  - `sendOtp(phone)` - Uses MSG91 SDK `sendOTP()` method
  - `verifyOtp(otp, phone)` - Uses MSG91 SDK `verifyOTP()` method, returns accessToken
  - `retryOtp(phone)` - Resends OTP using `sendOtp()`

### 2. `lib/auth.service.ts` ✅
- **Updated**: 
  - `sendOTP()` - Now uses `msg91Service.sendOtp()`
  - `verifyMsg91Token()` - Verifies accessToken with backend
  - `signUp()` - Removed password parameter
  - Removed `verifyOTPLogin()` and `verifyOTPSignup()` (deprecated)

### 3. `app/auth/otp.tsx` ✅
- **Updated**: 
  - Uses `msg91Service.verifyOtp()` to verify OTP with MSG91 SDK
  - Gets accessToken from MSG91 SDK
  - Calls `authService.verifyMsg91Token()` with accessToken
  - Handles new user vs existing user flow

### 4. `app/auth/login.tsx` ✅
- **Status**: Already compatible
- Uses `authService.sendOTP()` which now uses MSG91 SDK

### 5. `app/auth/signup.tsx` ✅
- **Status**: Already compatible
- Uses `authService.sendOTP()` which now uses MSG91 SDK

### 6. `app.json` ✅
- **Updated**: Added `msg91AuthToken` in `extra` config

---

## 🔧 Configuration Required

### 1. Frontend Configuration

Add MSG91 Auth Token to your environment or `app.json`:

**Option A: Environment Variable**
```bash
# .env or .env.local
EXPO_PUBLIC_MSG91_AUTH_TOKEN=your_auth_token_here
```

**Option B: app.json (already added)**
```json
{
  "expo": {
    "extra": {
      "msg91AuthToken": "your_auth_token_here"
    }
  }
}
```

### 2. Backend Configuration (Supabase Edge Functions)

Add these secrets in Supabase Dashboard → Settings → Edge Functions → Secrets:

```
MSG91_AUTH_KEY=your_auth_key_here
```

**Note**: `MSG91_AUTH_KEY` is used by `customer-verify-msg91-token` to verify the accessToken with MSG91 API.

---

## 🎯 Edge Functions Required

### ✅ Keep These Functions:

1. **`customer-verify-msg91-token`** ✅
   - Verifies MSG91 accessToken
   - Checks if user exists
   - Creates session for existing users
   - Returns `isNewUser: true` for new users

2. **`customer-signup`** ✅
   - Creates new user account
   - No password required
   - Email optional
   - Handles referral bonuses

3. **`customer-validate-session`** ✅
   - Validates session tokens on app launch

### ❌ Deleted Functions (No Longer Needed):

- `customer-send-otp` - Replaced by MSG91 SDK
- `customer-verify-otp` - Replaced by MSG91 SDK + `customer-verify-msg91-token`
- `customer-login-password` - Password login removed
- `customer-reset-password` - Password reset removed
- `customer-set-password` - Password setup removed
- `customer-check-phone` - Not needed

---

## 🔄 Complete Authentication Flow

### Login Flow
```
1. User enters phone → Login screen
2. Click "Send OTP" → msg91Service.sendOtp() [MSG91 SDK]
3. MSG91 sends OTP via SMS
4. User enters OTP → Your custom UI
5. Click "Verify" → msg91Service.verifyOtp() [MSG91 SDK]
6. MSG91 SDK returns accessToken
7. Call customer-verify-msg91-token(accessToken, phone)
8. Backend verifies token with MSG91 API
9. Backend checks if user exists
10. If exists → Create session → Login ✅
11. If new → Show profile form → Signup
```

### Signup Flow
```
1. User enters phone + referral code → Signup screen
2. Click "Continue" → msg91Service.sendOtp() [MSG91 SDK]
3. MSG91 sends OTP via SMS
4. User enters OTP → Your custom UI
5. Click "Verify" → msg91Service.verifyOtp() [MSG91 SDK]
6. MSG91 SDK returns accessToken
7. Call customer-verify-msg91-token(accessToken, phone)
8. Backend verifies token → Returns isNewUser: true
9. Show profile form (name required, email optional)
10. User completes profile → customer-signup()
11. Account created → Login ✅
```

---

## ⚠️ Important Notes

### 1. Custom Development Build Required
The `@msg91comm/react-native-sendotp` package uses native modules, so you'll need:
- **Custom development build** (not Expo Go)
- Run: `npx expo prebuild` and then build with EAS or locally

### 2. MSG91 Credentials
- **Frontend**: Needs `authToken` (Widget Auth Token from MSG91 dashboard)
- **Backend**: Needs `MSG91_AUTH_KEY` (API Auth Key from MSG91 dashboard)

These are different credentials:
- `authToken` - Used by SDK/widget on frontend
- `MSG91_AUTH_KEY` - Used by backend to verify tokens

### 3. AccessToken Handling
- MSG91 SDK's `verifyOTP()` should return an `accessToken`
- If `accessToken` is not returned, check MSG91 widget configuration
- The accessToken is verified by backend using MSG91 API

### 4. Phone Number Format
- MSG91 SDK expects: `{ mobile: "9876543210", countryCode: "91" }`
- Our service automatically formats phone numbers correctly

---

## 🧪 Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Configure MSG91 authToken in app.json or .env
- [ ] Configure MSG91_AUTH_KEY in Supabase secrets
- [ ] Create custom development build (not Expo Go)
- [ ] Test OTP sending on real device
- [ ] Test OTP verification
- [ ] Test new user signup flow
- [ ] Test existing user login flow
- [ ] Test with email (optional)
- [ ] Test without email
- [ ] Test referral code flow
- [ ] Test resend OTP

---

## 🐛 Troubleshooting

### Issue: "MSG91 auth token not configured"
**Solution**: Set `EXPO_PUBLIC_MSG91_AUTH_TOKEN` in .env or `msg91AuthToken` in app.json

### Issue: "No accessToken returned from MSG91"
**Solution**: 
- Check MSG91 widget configuration
- Ensure widget is set up with `exposeMethods: true`
- Verify authToken is correct

### Issue: "Package not found" or native module errors
**Solution**: 
- Create custom development build: `npx expo prebuild && npx expo run:ios` or `npx expo run:android`
- Cannot use Expo Go - requires native build

### Issue: OTP not received
**Solution**:
- Check MSG91 dashboard for delivery status
- Verify phone number format (10 digits, starts with 6-9)
- Check MSG91 account balance/limits

---

## 📚 MSG91 Documentation

- SDK Package: https://www.npmjs.com/package/@msg91comm/react-native-sendotp
- MSG91 Dashboard: https://control.msg91.com/
- Integration Guide: Check MSG91 knowledge base

---

## ✅ Summary

**What Changed:**
- ✅ Installed `@msg91comm/react-native-sendotp` package
- ✅ Updated `msg91.service.ts` to use MSG91 SDK methods
- ✅ Updated `auth.service.ts` to use new flow
- ✅ Updated `otp.tsx` to use SDK and verify token
- ✅ Removed password requirements
- ✅ Made email optional

**What You Need:**
- ✅ MSG91 Auth Token (for frontend SDK)
- ✅ MSG91 Auth Key (for backend verification)
- ✅ Custom development build (not Expo Go)

**Edge Functions Needed:**
- ✅ `customer-verify-msg91-token` (verify token, check user)
- ✅ `customer-signup` (create new user)
- ✅ `customer-validate-session` (session validation)

**Edge Functions Deleted:**
- ❌ `customer-send-otp` (replaced by SDK)
- ❌ `customer-verify-otp` (replaced by SDK + verify-msg91-token)

---

## 🎉 Integration Complete!

Your app now uses MSG91 SDK with your custom UI. All OTP operations happen on the frontend using the SDK, and the backend only verifies tokens and manages user sessions.


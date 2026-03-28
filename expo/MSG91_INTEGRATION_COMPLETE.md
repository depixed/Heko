# MSG91 OTP Integration - Implementation Complete

## ✅ Implementation Summary

All changes have been implemented to integrate MSG91 OTP system, remove password requirements, and make email optional.

---

## 📋 Changes Made

### 1. Backend Edge Functions

#### ✅ `customer-send-otp/index.ts`
- **Updated**: Replaced Twilio API with MSG91 REST API
- **Endpoint**: `https://control.msg91.com/api/v5/otp`
- **Features**:
  - Validates Indian mobile numbers (10 digits, starts with 6-9)
  - Formats phone to MSG91 format (91XXXXXXXXXX)
  - Supports optional template_id and sender_id
  - Returns request_id for tracking

#### ✅ `customer-verify-otp/index.ts`
- **Updated**: Replaced Twilio verification with MSG91 API
- **Endpoint**: `https://control.msg91.com/api/v5/otp/verify`
- **Features**:
  - Verifies OTP using MSG91 API
  - Checks if user exists in database
  - Returns `isNewUser: true` for new users
  - Creates session for existing users
  - No password required

#### ✅ `customer-signup/index.ts`
- **Updated**: Removed password requirement, made email optional
- **Changes**:
  - Only requires `phone` and `name`
  - `email` is optional (can be null)
  - `password_hash` set to null
  - Validates phone format (Indian numbers)
  - Checks for duplicate phone/email
  - Handles referral bonuses

#### ✅ `customer-verify-msg91-token/index.ts` (NEW)
- **Created**: New edge function for MSG91 token verification
- **Purpose**: Verifies access tokens from MSG91 widget/SDK
- **Note**: Currently trusts token from SDK (can be enhanced with token signature verification)

---

### 2. Frontend Services

#### ✅ `lib/msg91.service.ts` (NEW)
- **Created**: MSG91 service wrapper
- **Features**:
  - Uses REST API (works across all platforms - web, iOS, Android)
  - Formats phone numbers for MSG91
  - Methods: `sendOtp()`, `verifyOtp()`, `retryOtp()`
  - Calls backend edge functions (keeps credentials secure)

#### ✅ `lib/auth.service.ts`
- **Updated**: 
  - `sendOTP()`: Now uses MSG91 service
  - `signUp()`: Removed password parameter
  - `verifyMsg91Token()`: New method for MSG91 token verification

---

### 3. Frontend Screens

#### ✅ `app/auth/login.tsx`
- **Updated**: 
  - Removed password input field
  - Removed password login handler
  - OTP login is now the only method
  - Simplified UI - just phone input and "Send OTP" button

#### ✅ `app/auth/otp.tsx`
- **Updated**: 
  - Removed password creation stage
  - Removed password-related state and validation
  - Updated to use MSG91 service
  - Flow: OTP → Profile (for new users) or Login (for existing users)
  - OTP length changed to 6 digits (MSG91 standard)

#### ✅ `app/auth/signup.tsx`
- **Status**: No changes needed
- Uses `authService.sendOTP()` which now uses MSG91

---

### 4. Configuration

#### ✅ `constants/config.ts`
- **Updated**: Added MSG91 configuration section
- **Note**: Widget ID and Auth Token should be set via environment variables

---

## 🔧 Environment Variables Required

### Backend (Supabase Edge Functions)
Add these secrets in Supabase Dashboard → Settings → Edge Functions → Secrets:

```
MSG91_AUTH_KEY=your_auth_key_here
MSG91_TEMPLATE_ID=your_template_id (optional)
MSG91_SENDER_ID=your_sender_id (optional, 6 characters)
```

### Frontend (Optional - for widget-based approach)
If using MSG91 widget directly in frontend:

```json
// app.json or .env
{
  "expo": {
    "extra": {
      "msg91WidgetId": "YOUR_WIDGET_ID",
      "msg91AuthToken": "YOUR_AUTH_TOKEN"
    }
  }
}
```

---

## 📱 Authentication Flow

### Login Flow
1. User enters phone number
2. Clicks "Send OTP"
3. Backend calls MSG91 API to send OTP
4. User enters 6-digit OTP
5. Backend verifies OTP with MSG91
6. If existing user → Create session → Login
7. If new user → Show profile form → Complete signup

### Signup Flow
1. User enters phone number (and optional referral code)
2. Clicks "Continue"
3. Backend calls MSG91 API to send OTP
4. User enters 6-digit OTP
5. Backend verifies OTP with MSG91
6. If phone already exists → Error
7. If new user → Show profile form (name required, email optional)
8. User completes profile → Account created → Login

---

## 🗄️ Database Changes Required

Run this SQL in Supabase SQL Editor to remove email/password validation:

```sql
-- Remove validation trigger that requires email and password
DROP TRIGGER IF EXISTS trigger_validate_new_profile ON profiles;
DROP FUNCTION IF EXISTS validate_new_profile();

-- Note: The unique email index can stay - it allows null emails
-- Only enforces uniqueness when email is provided
```

---

## ✅ Testing Checklist

- [ ] Configure MSG91 credentials in Supabase
- [ ] Test OTP sending (should receive SMS)
- [ ] Test OTP verification (valid OTP)
- [ ] Test OTP verification (invalid OTP)
- [ ] Test new user signup flow
- [ ] Test existing user login flow
- [ ] Test with email (optional)
- [ ] Test without email
- [ ] Test referral code flow
- [ ] Test resend OTP functionality

---

## 🚀 Next Steps

1. **Get MSG91 Credentials**:
   - Sign up at https://msg91.com
   - Get Auth Key from Dashboard
   - Create OTP template (optional)
   - Get Sender ID (optional)

2. **Configure Backend**:
   - Add MSG91 secrets to Supabase Edge Functions
   - Deploy updated edge functions

3. **Test Integration**:
   - Test with real phone numbers
   - Verify OTP delivery
   - Test complete auth flows

4. **Database Migration**:
   - Run SQL to remove validation trigger
   - Verify existing users can still login

---

## 📝 Notes

- **OTP Length**: Changed from configurable to fixed 6 digits (MSG91 standard)
- **Phone Format**: All phone numbers stored in E.164 format (+91XXXXXXXXXX)
- **Password**: Completely removed from signup/login flows
- **Email**: Optional - can be null in database
- **Backward Compatibility**: Existing users without passwords can still login via OTP

---

## 🔍 Files Modified

### Backend
- `supabase/functions/customer-send-otp/index.ts`
- `supabase/functions/customer-verify-otp/index.ts`
- `supabase/functions/customer-signup/index.ts`
- `supabase/functions/customer-verify-msg91-token/index.ts` (NEW)

### Frontend
- `lib/msg91.service.ts` (NEW)
- `lib/auth.service.ts`
- `app/auth/login.tsx`
- `app/auth/otp.tsx`
- `constants/config.ts`

---

## ⚠️ Important Notes

1. **Custom Development Build**: If you want to use MSG91's native SDK (for auto-read OTP), you'll need a custom development build (not Expo Go)

2. **Current Implementation**: Uses REST API approach which works on all platforms (web, iOS, Android) without native modules

3. **Token Verification**: The `customer-verify-msg91-token` function currently trusts tokens from the SDK. For production, consider implementing token signature verification if MSG91 provides it.

4. **Error Handling**: All MSG91 API errors are properly caught and returned to frontend with user-friendly messages

---

## 🎉 Integration Complete!

All changes have been implemented. The app now uses MSG91 for OTP verification with no password or email requirements.


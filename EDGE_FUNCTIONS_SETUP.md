# Edge Functions Integration - Customer Authentication

This document describes the customer app authentication implementation using Supabase Edge Functions.

## Overview

The customer app now uses Edge Functions for phone-based OTP authentication instead of direct Supabase Auth. This allows customers to sign up and log in using only their phone number.

## Edge Functions Required

You need to deploy these 4 Edge Functions to your Supabase project:

1. **customer-send-otp** - Generates and sends OTP to phone number
2. **customer-verify-otp** - Verifies OTP and checks if user exists
3. **customer-signup** - Creates new customer profile with session
4. **customer-validate-session** - Validates session token on app launch

## Implementation Status

✅ **Customer App Integration**: Complete
- `lib/auth.service.ts` updated to use Edge Functions
- `contexts/AuthContext.tsx` validates session on app launch
- Login, Signup, and OTP screens configured

## Authentication Flow

### Login Flow
1. User enters phone number in login screen
2. App calls `customer-send-otp` Edge Function
3. User receives OTP (currently dev mode returns OTP in response)
4. User enters OTP in OTP screen
5. App calls `customer-verify-otp` Edge Function
6. If user exists: Returns session token and user data
7. App stores session and navigates to home screen

### Signup Flow
1. User enters phone number in signup screen
2. App calls `customer-send-otp` Edge Function
3. User receives OTP
4. User enters OTP in OTP screen
5. App calls `customer-verify-otp` Edge Function
6. If new user: Shows profile completion form
7. User enters name, email (optional), referral code (optional)
8. App calls `customer-signup` Edge Function
9. Edge Function creates profile with auto-generated referral code
10. Returns session token and user data
11. App stores session and navigates to home screen

### Session Validation (App Launch)
1. App loads stored session token from AsyncStorage
2. Calls `customer-validate-session` Edge Function
3. If valid: User is logged in automatically
4. If invalid/expired: Session cleared, user sees auth screens

## Edge Function Endpoints

All endpoints use: `https://kilpufxhteouojcyzqto.supabase.co/functions/v1/`

### 1. Send OTP
**POST** `/customer-send-otp`

Request:
```json
{
  "phone": "+911234567890"
}
```

Response (Dev Mode):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"
}
```

### 2. Verify OTP
**POST** `/customer-verify-otp`

Request:
```json
{
  "phone": "+911234567890",
  "otp": "123456"
}
```

Response (Existing User):
```json
{
  "success": true,
  "isNewUser": false,
  "sessionToken": "uuid-token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+911234567890",
    "email": "john@example.com",
    "referral_code": "HEKO123ABC",
    "virtual_wallet": 0,
    "actual_wallet": 0,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

Response (New User):
```json
{
  "success": true,
  "isNewUser": true,
  "phone": "+911234567890"
}
```

### 3. Complete Signup
**POST** `/customer-signup`

Request:
```json
{
  "phone": "+911234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "referredBy": "HEKO123XYZ"
}
```

Response:
```json
{
  "success": true,
  "sessionToken": "uuid-token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+911234567890",
    "email": "john@example.com",
    "referral_code": "HEKO456DEF",
    "virtual_wallet": 0,
    "actual_wallet": 0,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Validate Session
**POST** `/customer-validate-session`

Request:
```json
{
  "sessionToken": "uuid-token"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+911234567890",
    "email": "john@example.com",
    "referral_code": "HEKO123ABC",
    "virtual_wallet": 0,
    "actual_wallet": 0,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Database Tables Used

### otp_verifications
Stores OTPs with 10-minute expiry:
```sql
CREATE TABLE public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

### customer_sessions
Stores session tokens with 30-day expiry:
```sql
CREATE TABLE public.customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

## Next Steps

1. **Deploy Edge Functions**: Deploy the 4 functions to your Supabase project
2. **Setup SMS Provider**: Integrate Twilio/AWS SNS in `customer-send-otp` function
3. **Remove Dev OTP**: Remove OTP from response in production
4. **Add Rate Limiting**: Prevent OTP spam/abuse
5. **Setup Cleanup**: Schedule automatic cleanup of expired OTPs/sessions

## Security Notes

- Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Session tokens are cryptographically random UUIDs
- Sessions expire after 30 days
- OTPs expire after 10 minutes
- Phone numbers formatted as E.164 (+91XXXXXXXXXX)

## Testing

In development, OTP is returned in the send-otp response for easy testing. Any 6-digit code works for verification.

For production testing:
1. Integrate SMS provider
2. Test with real phone numbers
3. Verify OTP delivery and expiry
4. Test session validation and expiry

## Troubleshooting

**Issue**: "Failed to send OTP"
- Check Edge Function logs in Supabase Dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in function secrets
- Check network connectivity

**Issue**: "Invalid OTP"
- OTP may have expired (10 min limit)
- Check otp_verifications table for stored OTP
- Verify phone number format matches

**Issue**: "Session validation failed"
- Session may have expired (30 day limit)
- Check customer_sessions table
- User will be logged out automatically

## Related Files

- `lib/auth.service.ts` - Authentication service with Edge Function calls
- `contexts/AuthContext.tsx` - Auth state management and session validation
- `app/auth/login.tsx` - Login screen
- `app/auth/signup.tsx` - Signup screen  
- `app/auth/otp.tsx` - OTP verification and profile completion
- `constants/supabase.ts` - Supabase configuration

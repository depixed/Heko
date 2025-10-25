# Edge Functions Deployment Guide

## Overview

This guide explains how to deploy the 4 customer authentication Edge Functions to your Supabase project.

## Edge Functions Created

1. **customer-send-otp** - Generates and sends OTP to phone number
2. **customer-verify-otp** - Verifies OTP and checks if user exists
3. **customer-signup** - Creates new customer profile with session (FIXED: Now generates UUID for profile ID)
4. **customer-validate-session** - Validates session token on app launch

## Key Fix Applied

The `customer-signup` function now explicitly generates a UUID for the profile ID before insertion:

```typescript
const profileId = crypto.randomUUID()

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: profileId,  // Explicit ID generation
    phone,
    name,
    email: email || null,
    referral_code: referralCode,
    referred_by: referrerId,
    virtual_wallet: 0,
    actual_wallet: 0,
    status: 'active'
  })
```

This fixes the error: `null value in column "id" of relation "profiles" violates not-null constraint`

## Deployment Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref ijfgikkpiirepmjyvidl
```

### 4. Deploy All Functions

From your project root directory:

```bash
# Deploy all functions at once
supabase functions deploy customer-send-otp
supabase functions deploy customer-verify-otp
supabase functions deploy customer-signup
supabase functions deploy customer-validate-session
```

Or deploy individually:

```bash
cd supabase/functions

# Deploy each function
supabase functions deploy customer-send-otp
supabase functions deploy customer-verify-otp
supabase functions deploy customer-signup
supabase functions deploy customer-validate-session
```

### 5. Verify Deployment

Check your Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions
2. You should see all 4 functions listed
3. Check logs for any deployment errors

## Testing After Deployment

### Test Signup Flow

1. **Send OTP**:
```bash
curl -X POST \
  https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"phone": "+919876543210"}'
```

2. **Verify OTP** (New User):
```bash
curl -X POST \
  https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-verify-otp \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"phone": "+919876543210", "otp": "123456"}'
```

3. **Complete Signup**:
```bash
curl -X POST \
  https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "phone": "+919876543210",
    "name": "Test User",
    "email": "test@example.com",
    "referredBy": "HEKOXYZ123"
  }'
```

4. **Validate Session**:
```bash
curl -X POST \
  https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-validate-session \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"sessionToken": "YOUR_SESSION_TOKEN"}'
```

## Environment Variables

The Edge Functions automatically access these environment variables:
- `SUPABASE_URL` - Auto-injected by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected by Supabase

No manual configuration needed!

## Features Included in customer-signup

✅ Generates UUID for profile ID (fixes the NULL constraint error)
✅ Creates profile in `profiles` table
✅ Creates user role in `user_roles` table
✅ Generates unique referral code (HEKO + random alphanumeric)
✅ Validates referral code if provided
✅ Awards ₹50 referral bonus to both referrer and new user
✅ Creates wallet transactions for referral bonuses
✅ Creates 30-day session token
✅ Returns complete user data with session

## Referral System Logic

When a user signs up with a referral code:
1. Validates the referral code exists
2. Awards ₹50 to the referrer's virtual wallet
3. Awards ₹50 to the new user's virtual wallet
4. Creates wallet transaction records for both users
5. Links the new user to the referrer via `referred_by` field

## Database Tables Used

### profiles
- Stores customer profile data
- `id` (UUID) - Now explicitly generated in edge function
- `phone`, `name`, `email`
- `referral_code` - Auto-generated unique code
- `referred_by` - UUID of referrer (if applicable)
- `virtual_wallet`, `actual_wallet` - Wallet balances

### user_roles
- Links users to their roles
- `user_id` (UUID) - References profiles(id)
- `role` - Set to 'user' for customers

### customer_sessions
- Stores session tokens
- `session_token` (UUID) - 30-day expiry
- `user_id` - References profiles(id)

### otp_verifications
- Stores OTPs temporarily
- 10-minute expiry
- Marked as verified after use

### wallet_transactions
- Records all wallet credits/debits
- Used for referral bonuses, cashback, etc.

## Production Checklist

- [ ] Deploy all 4 edge functions
- [ ] Test signup flow end-to-end
- [ ] Integrate SMS provider (Twilio/AWS SNS) in customer-send-otp
- [ ] Remove OTP from send-otp response (dev mode only)
- [ ] Setup automatic cleanup for expired OTPs/sessions
- [ ] Add rate limiting to prevent OTP spam
- [ ] Monitor edge function logs for errors
- [ ] Test referral code validation
- [ ] Verify wallet transactions are created correctly

## Troubleshooting

### "null value in column id violates not-null constraint"
✅ **Fixed!** The updated customer-signup function now generates the ID explicitly.

### "Failed to deploy function"
- Check you're logged into Supabase CLI: `supabase login`
- Verify project is linked: `supabase link --project-ref YOUR_PROJECT_REF`
- Check function code syntax

### "Invalid or expired session"
- Sessions expire after 30 days
- User will be automatically logged out
- Check customer_sessions table for active sessions

### "Referral code not found"
- Verify the referral code exists in profiles table
- Referral codes are case-sensitive
- Check for typos

## Monitoring

View Edge Function logs in Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions
2. Click on each function
3. View "Logs" tab
4. Monitor for errors, especially during signup

## Next Steps

1. Deploy the functions using the commands above
2. Test the signup flow in your app
3. Verify profile creation works without errors
4. Check wallet transactions are created for referrals
5. Monitor edge function logs for any issues

## Support

If you encounter any issues after deployment:
1. Check edge function logs in Supabase Dashboard
2. Verify database tables exist with correct schemas
3. Ensure RLS policies allow service role access
4. Test API endpoints using curl commands above

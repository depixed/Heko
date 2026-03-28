# Web OTP Deployment Guide

## Issue: "Failed to fetch" Error on Web

When testing on web, you're getting "Failed to fetch" errors because the `customer-send-otp` and `customer-verify-otp` edge functions need to be deployed to Supabase.

## Solution: Deploy Edge Functions

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
cd /Users/ronak/Documents/PROJECTS/Heko
supabase link --project-ref ijfgikkpiirepmjyvidl
```

### Step 4: Deploy the Functions

Deploy both functions needed for web OTP:

```bash
# Deploy customer-send-otp
supabase functions deploy customer-send-otp --project-ref ijfgikkpiirepmjyvidl

# Deploy customer-verify-otp
supabase functions deploy customer-verify-otp --project-ref ijfgikkpiirepmjyvidl
```

### Step 5: Set Environment Variables

Make sure these secrets are set in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/settings/functions
2. Add these secrets:
   - `MSG91_AUTH_KEY` - Your MSG91 API Auth Key
   - `MSG91_TEMPLATE_ID` (optional) - Template ID from MSG91
   - `MSG91_SENDER_ID` (optional) - 6-character sender ID

### Step 6: Verify Deployment

Test the function directly:

```bash
curl -X POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

## Alternative: Use Native Platforms Only

If you don't want to deploy the functions for web, you can:

1. Show a message that OTP is only available on mobile
2. Or use a different authentication method for web

## Current Status

- ✅ `customer-send-otp` function exists in code
- ✅ `customer-verify-otp` function exists in code
- ❌ Functions need to be deployed to Supabase
- ❌ MSG91 credentials need to be set in Supabase secrets

## Quick Deploy Command

```bash
# From project root
supabase functions deploy customer-send-otp customer-verify-otp --project-ref ijfgikkpiirepmjyvidl
```


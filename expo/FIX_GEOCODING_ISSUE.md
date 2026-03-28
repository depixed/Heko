# Fix Geocoding Issue - API Key Not Set

## Problem Identified ✅

The edge function is deployed and working, but it's getting `REQUEST_DENIED` from Google's Geocoding API because the `GOOGLE_GEOCODING_API_KEY` secret is not set in Supabase.

**Test result:**
```json
{"error":"Geocoding failed: REQUEST_DENIED"}
```

## Solution Steps

### Step 1: Get Your Google API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create/Select a Project:**
   - Create a new project or select existing one

3. **Enable Geocoding API:**
   - Go to: APIs & Services → Library
   - Search for "Geocoding API"
   - Click "Enable"

4. **Create API Key:**
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - Copy the API key

5. **Restrict the API Key (IMPORTANT for security):**
   - Click on the API key you just created
   - Under "API restrictions", select "Restrict key"
   - Check only "Geocoding API"
   - Save

### Step 2: Set the Secret in Supabase

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/settings/functions
2. Click on "Edge Functions" in the left sidebar
3. Click "Manage secrets"
4. Click "New secret"
5. Set:
   - **Name:** `GOOGLE_GEOCODING_API_KEY`
   - **Value:** (paste your Google API key)
6. Click "Save"

**Option B: Via Supabase CLI**

```bash
# Login to Supabase (if not already logged in)
supabase login

# Set the secret
supabase secrets set GOOGLE_GEOCODING_API_KEY=your_actual_google_api_key_here --project-ref ijfgikkpiirepmjyvidl
```

Replace `your_actual_google_api_key_here` with your actual API key from Google Cloud Console.

### Step 3: Redeploy the Edge Function (if needed)

After setting the secret, the function should work immediately, but if not:

```bash
supabase functions deploy geocode-address --project-ref ijfgikkpiirepmjyvidl
```

### Step 4: Test the Fix

Run this command to test if geocoding is working:

```bash
curl -X POST "https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/geocode-address" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk" \
  -H "Content-Type: application/json" \
  -d '{"address": "Gateway of India, Mumbai, Maharashtra, India"}'
```

**Expected successful response:**
```json
{
  "latitude": 18.9219841,
  "longitude": 72.8346543,
  "formatted_address": "Gateway of India, Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India"
}
```

### Step 5: Test in the App

1. Open your app
2. Go to "Add Address" or "Edit Address"
3. Fill in the address details
4. Save the address
5. Check the browser console - you should see:
   - `[Geocoding] Geocoding address: ...`
   - `[Geocoding] Success: {lat: ..., lng: ...}`
6. Verify in the database that `lat` and `lng` columns are populated

## Verification Checklist

- [ ] Google Geocoding API enabled in Google Cloud Console
- [ ] API key created in Google Cloud Console
- [ ] API key restricted to Geocoding API only
- [ ] Secret `GOOGLE_GEOCODING_API_KEY` set in Supabase
- [ ] Edge function test returns coordinates (not `REQUEST_DENIED`)
- [ ] Adding address in app geocodes successfully
- [ ] Updating address in app geocodes successfully
- [ ] Database has `lat` and `lng` values populated

## Troubleshooting

### Still getting REQUEST_DENIED?

1. **Check API key is correct:**
   - Copy the key again from Google Cloud Console
   - Make sure there are no extra spaces or characters

2. **Verify Geocoding API is enabled:**
   - Go to Google Cloud Console → APIs & Services → Enabled APIs
   - "Geocoding API" should be listed

3. **Check API key restrictions:**
   - Go to Google Cloud Console → Credentials
   - Click on your API key
   - Under "API restrictions", ensure "Geocoding API" is selected
   - If you have "HTTP referrers" restriction, remove it (edge functions won't match)

4. **Check billing is enabled:**
   - Google requires billing to be enabled even for free tier
   - Go to Google Cloud Console → Billing
   - Ensure a billing account is linked

### Edge function not responding?

1. **Check edge function logs:**
   - Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions/geocode-address/logs
   - Look for errors

2. **Verify secret name is exact:**
   - It must be exactly: `GOOGLE_GEOCODING_API_KEY` (case-sensitive)

## Cost Information

**Google Geocoding API Pricing:**
- **Free Tier:** $200/month credit = 40,000 requests
- **After Free Tier:** $5 per 1,000 requests

**For reference:**
- 1 address add/update = 1 request
- 1000 users adding 1 address each = 1000 requests = FREE
- The free tier is very generous for most apps

## Support

If you still have issues after following these steps:
1. Check edge function logs in Supabase Dashboard
2. Check browser console for client-side errors
3. Verify the exact error message from Google API


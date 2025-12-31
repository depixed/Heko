# Geocoding Implementation Guide

## Overview
This implementation automatically geocodes addresses (converts addresses to latitude/longitude coordinates) when users add or update addresses using Google Geocoding API via a secure Supabase Edge Function.

## Architecture

### Components
1. **Edge Function** (`supabase/functions/geocode-address/index.ts`)
   - Server-side function that securely accesses Google API key
   - Handles geocoding requests from the client
   - Returns latitude and longitude coordinates

2. **Geocoding Service** (`lib/geocoding.service.ts`)
   - Client-side service that calls the edge function
   - Builds address strings from address components
   - Handles errors gracefully

3. **AddressContext** (`contexts/AddressContext.tsx`)
   - Automatically geocodes addresses when adding/updating
   - Stores coordinates in the database

## Deployment Steps

### Step 1: Deploy the Edge Function

1. **Deploy the function to Supabase:**
   ```bash
   supabase functions deploy geocode-address
   ```

2. **Set the Google API key secret:**
   ```bash
   supabase secrets set GOOGLE_GEOCODING_API_KEY=your_actual_api_key_here
   ```

   Or via Supabase Dashboard:
   - Go to Project Settings → Edge Functions → Secrets
   - Add secret: `GOOGLE_GEOCODING_API_KEY` with your Google API key value

### Step 2: Verify Google API Setup

1. **Enable Geocoding API in Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → Library
   - Search for "Geocoding API"
   - Click "Enable"

2. **Create/Verify API Key:**
   - Go to APIs & Services → Credentials
   - Create a new API key or use existing one
   - **Important:** Restrict the API key to "Geocoding API" only for security
   - Copy the API key and use it in Step 1 above

### Step 3: Test the Implementation

1. **Test Adding a New Address:**
   - Open the app and navigate to add address
   - Fill in address details (flat, area, city, state, pincode)
   - Save the address
   - Check the database - the `lat` and `lng` columns should be populated

2. **Test Updating an Address:**
   - Edit an existing address
   - Change any location-related field (city, state, pincode, etc.)
   - Save the changes
   - Check the database - coordinates should be updated

3. **Check Logs:**
   - In Supabase Dashboard → Edge Functions → Logs
   - Look for `geocode-address` function logs
   - Verify successful geocoding requests

## How It Works

### Adding a New Address
1. User fills in address form and clicks save
2. `AddressContext.addAddress()` is called
3. Address components are combined into a full address string
4. `geocodingService.geocodeAddress()` calls the edge function
5. Edge function calls Google Geocoding API with the secret key
6. Coordinates (lat/lng) are returned
7. Address is saved with coordinates in the database

### Updating an Address
1. User edits address and saves changes
2. `AddressContext.updateAddress()` detects if location fields changed
3. If location changed, geocoding is triggered
4. New coordinates are fetched and saved
5. Address is updated in the database

## Error Handling

- **If geocoding fails:** Address is still saved, but without coordinates
- **If API key is missing:** Edge function returns error, address saved without coordinates
- **If address is invalid:** Google API returns error, address saved without coordinates
- **All errors are logged** for debugging

## Security Features

✅ **API Key Protection:** Google API key is stored as Supabase secret, never exposed to client
✅ **Server-Side Processing:** All geocoding happens on Supabase edge functions
✅ **Error Handling:** Graceful degradation - app continues to work even if geocoding fails
✅ **CORS Headers:** Properly configured for cross-origin requests

## Database Schema

The `user_addresses` table already has `lat` and `lng` columns:
- `lat`: DECIMAL(10, 8) - Latitude coordinate
- `lng`: DECIMAL(11, 8) - Longitude coordinate

These columns are nullable, so addresses can be saved even if geocoding fails.

## Cost Considerations

Google Geocoding API Pricing:
- **Free Tier:** $200/month credit (40,000 requests)
- **After Free Tier:** $5 per 1,000 requests

**Recommendations:**
- Monitor usage in Google Cloud Console
- Set up billing alerts
- Consider caching geocoded addresses to reduce API calls
- Only geocode when address actually changes

## Troubleshooting

### Issue: Coordinates not being saved
- **Check:** Edge function logs in Supabase Dashboard
- **Check:** Browser console for client-side errors
- **Verify:** API key is set correctly in Supabase secrets
- **Verify:** Geocoding API is enabled in Google Cloud Console

### Issue: "Geocoding service not configured" error
- **Solution:** Ensure `GOOGLE_GEOCODING_API_KEY` secret is set in Supabase
- **Verify:** Secret name matches exactly (case-sensitive)

### Issue: "Geocoding failed: ZERO_RESULTS"
- **Cause:** Address string couldn't be found by Google
- **Solution:** This is normal for invalid addresses - address will be saved without coordinates

### Issue: Edge function returns 500 error
- **Check:** Edge function logs for detailed error
- **Verify:** API key is valid and has Geocoding API enabled
- **Check:** Network connectivity from Supabase to Google APIs

## Future Enhancements

Potential improvements:
1. **Caching:** Cache geocoded addresses to reduce API calls
2. **Batch Geocoding:** Geocode multiple addresses at once
3. **Reverse Geocoding:** Get address from coordinates
4. **Address Validation:** Validate addresses before saving
5. **Retry Logic:** Retry failed geocoding requests

## Files Modified

- ✅ `supabase/functions/geocode-address/index.ts` - New edge function
- ✅ `lib/geocoding.service.ts` - New geocoding service
- ✅ `contexts/AddressContext.tsx` - Updated to use geocoding

## Testing Checklist

- [ ] Deploy edge function to Supabase
- [ ] Set `GOOGLE_GEOCODING_API_KEY` secret
- [ ] Enable Geocoding API in Google Cloud Console
- [ ] Test adding new address with valid address
- [ ] Test adding new address with invalid address (should still save)
- [ ] Test updating address location fields
- [ ] Test updating address non-location fields (should not geocode)
- [ ] Verify coordinates in database
- [ ] Check edge function logs for errors
- [ ] Test with network offline (should handle gracefully)


# Banner Edge Functions Deployment Guide

## Overview

This guide explains how to deploy the 4 banner-related Edge Functions to your Supabase project.

## Edge Functions Created

1. **get-banners** - Fetches personalized banners based on user context
2. **track-banner-impression** - Tracks banner impressions
3. **track-banner-click** - Tracks banner clicks
4. **get-banner-analytics** - Retrieves banner analytics data

## Key Fix Applied

The `get-banners` function has been updated to use `is_logged_in` parameter (instead of `logged_in`) to match the client code:

```typescript
// Fixed: Use 'is_logged_in' to match client code
const isLoggedIn = url.searchParams.get('is_logged_in') === 'true';
```

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Supabase project linked**
   - Project ref: `ijfgikkpiirepmjyvidl`
   - URL: `https://ijfgikkpiirepmjyvidl.supabase.co`

## Deployment Steps

### Step 1: Link Your Supabase Project

```bash
# Navigate to project directory
cd /Users/ronak/Documents/PROJECTS/Heko

# Link to your Supabase project (if not already linked)
supabase link --project-ref ijfgikkpiirepmjyvidl
```

### Step 2: Deploy All Banner Functions

Deploy all functions at once:

```bash
# Deploy get-banners
supabase functions deploy get-banners

# Deploy track-banner-impression
supabase functions deploy track-banner-impression

# Deploy track-banner-click
supabase functions deploy track-banner-click

# Deploy get-banner-analytics
supabase functions deploy get-banner-analytics
```

Or deploy individually from the functions directory:

```bash
cd supabase/functions

supabase functions deploy get-banners
supabase functions deploy track-banner-impression
supabase functions deploy track-banner-click
supabase functions deploy get-banner-analytics
```

### Step 3: Verify Deployment

Check your Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions
2. Verify all 4 functions are listed and deployed

## Testing the Functions

### Test get-banners

```bash
PROJECT_URL="https://ijfgikkpiirepmjyvidl.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk"

# Test as logged-out user
curl -X GET "$PROJECT_URL/functions/v1/get-banners?app_version=1.0.0&is_logged_in=false" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"

# Test as logged-in user
curl -X GET "$PROJECT_URL/functions/v1/get-banners?app_version=1.0.0&is_logged_in=true&user_id=USER_ID_HERE" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"

# Test with location
curl -X GET "$PROJECT_URL/functions/v1/get-banners?app_version=1.0.0&is_logged_in=false&lat=19.0760&lng=72.8777&city=Mumbai" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"
```

Expected response:
```json
{
  "placement": "home_hero",
  "version": 1,
  "banners": [
    {
      "id": "...",
      "title": "...",
      "subtitle": "...",
      "image_url": "...",
      "priority": 1,
      "start_at": "...",
      "end_at": "...",
      "deeplink": "...",
      "action_type": "...",
      "action_value": "..."
    }
  ],
  "ttl_seconds": 900
}
```

### Test track-banner-impression

```bash
curl -X POST "$PROJECT_URL/functions/v1/track-banner-impression" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "banner_id": "BANNER_ID_HERE",
    "user_id": "USER_ID_HERE",
    "session_id": "SESSION_ID_HERE",
    "city": "Mumbai",
    "app_version": "1.0.0",
    "device_type": "ios"
  }'
```

Expected response:
```json
{
  "success": true
}
```

### Test track-banner-click

```bash
curl -X POST "$PROJECT_URL/functions/v1/track-banner-click" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "banner_id": "BANNER_ID_HERE",
    "user_id": "USER_ID_HERE",
    "session_id": "SESSION_ID_HERE",
    "city": "Mumbai",
    "app_version": "1.0.0",
    "device_type": "ios"
  }'
```

Expected response:
```json
{
  "success": true
}
```

### Test get-banner-analytics

```bash
# Get analytics for all time
curl -X GET "$PROJECT_URL/functions/v1/get-banner-analytics" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"

# Get analytics for date range
curl -X GET "$PROJECT_URL/functions/v1/get-banner-analytics?start_date=2024-01-01&end_date=2024-12-31" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"
```

Expected response:
```json
{
  "analytics": [
    {
      "id": "...",
      "title": "...",
      "image": "...",
      "active": true,
      "created_at": "...",
      "impressions": 1000,
      "clicks": 50,
      "ctr": 5.0
    }
  ]
}
```

## Function Details

### get-banners

**Endpoint**: `/functions/v1/get-banners`

**Method**: GET

**Query Parameters**:
- `app_version` (required): App version (e.g., "1.0.0")
- `is_logged_in` (required): "true" or "false"
- `user_id` (optional): User ID if logged in
- `lat` (optional): Latitude for location-based targeting
- `lng` (optional): Longitude for location-based targeting
- `city` (optional): City name for city-based targeting

**Response**:
- Returns personalized banners based on:
  - App version compatibility
  - Logged-in status
  - City targeting
  - User segments (new_user, low_orders_30d, loyal_customer)
  - Date ranges (start_date, end_date)
- Includes ETag for caching
- Returns 304 Not Modified if ETag matches

### track-banner-impression

**Endpoint**: `/functions/v1/track-banner-impression`

**Method**: POST

**Body**:
```json
{
  "banner_id": "string (required)",
  "user_id": "string (optional)",
  "session_id": "string (optional)",
  "city": "string (optional)",
  "app_version": "string (optional)",
  "device_type": "string (optional)"
}
```

**Response**:
```json
{
  "success": true
}
```

### track-banner-click

**Endpoint**: `/functions/v1/track-banner-click`

**Method**: POST

**Body**: Same as track-banner-impression

**Response**: Same as track-banner-impression

### get-banner-analytics

**Endpoint**: `/functions/v1/get-banner-analytics`

**Method**: GET

**Query Parameters**:
- `start_date` (optional): Start date for filtering (ISO format)
- `end_date` (optional): End date for filtering (ISO format)

**Response**:
```json
{
  "analytics": [
    {
      "id": "banner_id",
      "title": "Banner Title",
      "image": "image_url",
      "active": true,
      "created_at": "timestamp",
      "impressions": 1000,
      "clicks": 50,
      "ctr": 5.0
    }
  ]
}
```

## Database Requirements

Ensure these tables exist:

1. **banners** table with columns:
   - `id` (uuid, primary key)
   - `title` (text)
   - `subtitle` (text)
   - `image` (text, URL)
   - `active` (boolean)
   - `priority` (integer)
   - `display_order` (integer)
   - `start_date` (timestamp)
   - `end_date` (timestamp)
   - `deeplink` (text)
   - `action_type` (text)
   - `action_value` (text)
   - `visibility` (jsonb) - Contains targeting rules

2. **banner_impressions** table with columns:
   - `id` (uuid, primary key)
   - `banner_id` (uuid, foreign key)
   - `user_id` (uuid, nullable)
   - `session_id` (text, nullable)
   - `city` (text, nullable)
   - `app_version` (text, nullable)
   - `device_type` (text, nullable)
   - `created_at` (timestamp)

3. **banner_clicks** table with columns:
   - Same as banner_impressions

4. **orders** table (for user segmentation):
   - `id` (uuid)
   - `user_id` (uuid)
   - `created_at` (timestamp)

## Visibility Rules Format

The `visibility` JSONB column in the `banners` table should follow this format:

```json
{
  "min_app_version": "1.0.0",
  "logged_in_only": true,
  "cities": ["Mumbai", "Delhi"],
  "radius_km": 10,
  "user_segments": ["new_user", "loyal_customer"]
}
```

## Troubleshooting

### Function not found
- Verify function is deployed: `supabase functions list`
- Check function name matches exactly

### CORS errors
- Functions include CORS headers automatically
- Verify `Access-Control-Allow-Origin: *` is present

### Parameter mismatch
- Ensure client sends `is_logged_in` (not `logged_in`)
- Check all required parameters are provided

### Database errors
- Verify tables exist with correct schema
- Check RLS policies allow service role access
- Verify foreign key relationships

## Next Steps

1. ✅ Deploy all functions
2. ✅ Test each function individually
3. ✅ Verify client integration works
4. ✅ Monitor function logs in Supabase dashboard
5. ✅ Set up alerts for function errors

---

**Status**: Ready for Deployment
**Last Updated**: [Current Date]


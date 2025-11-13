# Banner Troubleshooting Guide

## Issue: Banners Not Showing on Home Page

### Step 1: Check Console Logs

Open your browser/device console and look for these log messages:

1. **`[useBanners] Loading banners from cache`** - Should appear when component loads
2. **`[BannerService] Fetching banners with params:`** - Should show the parameters being sent
3. **`[BannerService] Full URL:`** - Should show the complete API URL
4. **`[BannerService] Response status:`** - Should show HTTP status code

### Step 2: Common Issues and Solutions

#### Issue 1: Edge Function Not Deployed (404 Error)

**Symptoms:**
- Console shows: `Failed to fetch banners: 404`
- Error message: "Banner endpoint not found"

**Solution:**
1. Deploy the edge function:
   ```bash
   supabase functions deploy get-banners
   ```
2. Verify deployment:
   ```bash
   supabase functions list
   ```
3. Check Supabase dashboard: https://supabase.com/dashboard/project/ijfgikkpiirepmjyvidl/functions

#### Issue 2: No Active Banners in Database

**Symptoms:**
- API returns 200 but `banners` array is empty
- Console shows: `Fetched 0 banners`

**Solution:**
1. Check if banners exist in database:
   ```sql
   SELECT * FROM banners WHERE active = true;
   ```
2. Verify banner date ranges:
   ```sql
   SELECT id, title, start_date, end_date, active 
   FROM banners 
   WHERE active = true 
   AND (start_date IS NULL OR start_date <= NOW())
   AND (end_date IS NULL OR end_date >= NOW());
   ```
3. Create a test banner if none exist

#### Issue 3: Banners Filtered Out by Targeting Rules

**Symptoms:**
- Banners exist in database but not showing
- Edge function logs show: "Banner X filtered: ..."

**Solution:**
1. Check banner visibility rules:
   ```sql
   SELECT id, title, visibility FROM banners WHERE active = true;
   ```
2. Verify user context matches targeting:
   - If `logged_in_only: true`, ensure user is logged in
   - If `cities: ["Mumbai"]`, ensure user's city is Mumbai
   - If `min_app_version: "2.0.0"`, ensure app version >= 2.0.0
3. Test with a banner that has no targeting rules

#### Issue 4: CORS or Network Error

**Symptoms:**
- Console shows network error
- `Failed to fetch` error
- CORS error in browser console

**Solution:**
1. Check if edge function has CORS headers (should be automatic)
2. Verify network connectivity
3. Check if API key is correct in `constants/supabase.ts`

#### Issue 5: Cache Issues

**Symptoms:**
- Old banners showing
- New banners not appearing
- Cache not refreshing

**Solution:**
1. Clear banner cache:
   ```typescript
   import { bannerCache } from '@/utils/bannerCache';
   await bannerCache.clearCache();
   ```
2. Or use debug utility:
   ```typescript
   import { clearBannerCacheAndRefresh } from '@/utils/bannerDebug';
   await clearBannerCacheAndRefresh();
   ```

### Step 3: Run Diagnostic Test

Add this to your home screen temporarily to test:

```typescript
import { testBannerAPI } from '@/utils/bannerDebug';

// In your component
useEffect(() => {
  testBannerAPI({
    isLoggedIn: !!user,
    userId: user?.id,
    city: userCity,
  });
}, []);
```

This will log detailed information about:
- Cache status
- API request/response
- Error details
- Direct fetch test

### Step 4: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → get-banners → Logs
3. Look for errors or warnings
4. Check if function is being called

### Step 5: Verify Database Setup

Ensure these tables exist and have data:

```sql
-- Check banners table
SELECT COUNT(*) FROM banners WHERE active = true;

-- Check banner structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'banners';

-- Check if visibility column exists
SELECT id, title, visibility FROM banners LIMIT 1;
```

### Step 6: Test API Directly

Test the API endpoint directly:

```bash
curl -X GET "https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/get-banners?app_version=1.0.0&is_logged_in=false" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

Expected response:
```json
{
  "placement": "home_hero",
  "version": 1,
  "banners": [...],
  "ttl_seconds": 900
}
```

### Step 7: Check Configuration

Verify banner config is enabled:

```typescript
// In constants/config.ts
BANNER: {
  ENABLED: true,  // Must be true
  // ... other config
}
```

### Quick Fixes

1. **Force Refresh**: Clear cache and reload
2. **Check Edge Function**: Ensure `get-banners` is deployed
3. **Check Database**: Ensure active banners exist
4. **Check Logs**: Look for errors in console
5. **Test API**: Use curl or Postman to test endpoint directly

### Still Not Working?

1. Check browser console for detailed error messages
2. Check Supabase edge function logs
3. Verify database has active banners
4. Test API endpoint directly
5. Check network tab for failed requests

---

## Debug Commands

### In Browser Console

```javascript
// Test banner API
import { testBannerAPI } from '@/utils/bannerDebug';
await testBannerAPI();

// Get banner status
import { getBannerStatus } from '@/utils/bannerDebug';
const status = await getBannerStatus();
console.log(status);

// Clear cache and refresh
import { clearBannerCacheAndRefresh } from '@/utils/bannerDebug';
await clearBannerCacheAndRefresh();
```

### Check Banner Status

```typescript
import { getBannerStatus } from '@/utils/bannerDebug';

const status = await getBannerStatus();
console.log('Banner Status:', {
  enabled: status.enabled,
  cacheExists: status.cacheExists,
  apiUrl: status.apiUrl,
  apiKeyPresent: status.apiKeyPresent,
});
```


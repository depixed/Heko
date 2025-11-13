# Banner Date Filtering Issue - Explanation & Fix

## Root Cause

Based on the network console screenshots, I identified two issues:

### Issue 1: Incorrect SQL Query Logic
The edge function was using chained `.or()` conditions:
```typescript
.or(`start_date.is.null,start_date.lte.${now}`)
.or(`end_date.is.null,end_date.gte.${now}`)
```

This doesn't work correctly in Supabase's query builder. The `.or()` method creates OR conditions, but when chained, they don't combine as AND conditions. This means banners were being filtered incorrectly.

### Issue 2: Future Date Banner
Your banner has:
- `start_date`: `2025-11-13T16:30:00+00:00` (November 13, 2025)
- `end_date`: `2025-11-13T16:32:00+00:00` (November 13, 2025)

If today's date is before November 13, 2025, the banner will be correctly filtered out because it hasn't started yet. This is expected behavior for scheduled banners.

## The Fix

I've updated the edge function to:
1. **Fetch all active banners** from the database (without date filtering in SQL)
2. **Filter by date in JavaScript** (more reliable and easier to debug)
3. **Add detailed logging** to show why banners are filtered

The new logic:
```typescript
// Filter banners by date range
const dateFilteredBanners = banners.filter(banner => {
  const startDate = banner.start_date ? new Date(banner.start_date) : null;
  const endDate = banner.end_date ? new Date(banner.end_date) : null;
  
  // Banner is valid if:
  // - Has started (no start_date OR start_date <= now)
  // - Hasn't ended (no end_date OR end_date >= now)
  const hasStarted = !startDate || startDate <= nowDate;
  const hasntEnded = !endDate || endDate >= nowDate;
  
  return hasStarted && hasntEnded;
});
```

## To See Your Banner Now

You have two options:

### Option 1: Update Banner Dates (Recommended for Testing)
Update your banner's dates to current/past dates:

```sql
UPDATE banners 
SET 
  start_date = NOW() - INTERVAL '1 day',  -- Started yesterday
  end_date = NOW() + INTERVAL '30 days'    -- Ends in 30 days
WHERE id = 'aff6ff9e-4eb0-4b6c-a268-ead2c2fbd762';
```

### Option 2: Remove Date Restrictions
Set dates to NULL to make banner always active:

```sql
UPDATE banners 
SET 
  start_date = NULL,
  end_date = NULL
WHERE id = 'aff6ff9e-4eb0-4b6c-a268-ead2c2fbd762';
```

## Next Steps

1. **Deploy the updated edge function**:
   ```bash
   supabase functions deploy get-banners
   ```

2. **Update your banner dates** (if you want to see it now):
   ```sql
   UPDATE banners 
   SET start_date = NOW() - INTERVAL '1 day',
       end_date = NOW() + INTERVAL '30 days'
   WHERE active = true;
   ```

3. **Test the API**:
   ```bash
   curl -X GET "https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/get-banners?app_version=1.0.0&is_logged_in=false" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "apikey: YOUR_ANON_KEY"
   ```

4. **Check edge function logs** in Supabase dashboard to see filtering details

## Expected Behavior After Fix

- Banners with `start_date` in the future will be filtered out (correct)
- Banners with `end_date` in the past will be filtered out (correct)
- Banners with NULL dates will always show (if active = true)
- Banners within date range will show (if other filters pass)

## Debugging

The edge function now logs detailed information:
- How many banners found before filtering
- How many banners after date filtering
- Why each banner was filtered (if filtered)

Check Supabase Edge Function logs to see this information.


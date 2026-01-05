# Edge Function Authentication Error Fix

## Error Description

When clicking "Login with OTP", the following error appears:
```
[AUTH] Error sending OTP: {success: false, error: 'Authenticate'}
[Login] Failed to send OTP: Authenticate
```

## Root Cause

The error "Authenticate" is coming from Supabase's edge function gateway, indicating that:
1. The edge function may not be deployed
2. The authorization headers are not being accepted
3. The edge function URL might be incorrect
4. There's a CORS or network issue

## Fixes Applied

### 1. Enhanced Error Handling in `auth.service.ts`

**Changes**:
- Added detailed logging for response status and headers
- Handle non-JSON responses (401, 403, etc.)
- Better error messages for authentication failures
- Network error handling

**Code**:
```typescript
// Check response status first
console.log('[AUTH] Response status:', response.status, response.statusText);

// Handle non-JSON responses
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await response.text();
  return { 
    success: false, 
    error: response.status === 401 || response.status === 403 
      ? 'Authentication failed. Please check your Supabase configuration.' 
      : `Failed to send OTP (${response.status})` 
  };
}
```

### 2. Improved User-Facing Error Messages

**In `login.tsx`**:
- Better error messages for authentication failures
- Retry option in error alerts
- More helpful guidance for users

---

## Verification Steps

### Step 1: Verify Edge Function is Deployed

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Check if `customer-send-otp` function exists
4. Verify it's deployed (should show "Active" status)

**If not deployed**, deploy it:
```bash
cd supabase/functions/customer-send-otp
supabase functions deploy customer-send-otp
```

### Step 2: Check Edge Function URL

The function should be accessible at:
```
https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp
```

**Test in browser** (should return CORS error, but confirms function exists):
```bash
curl -X POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"phone": "+911234567890"}'
```

### Step 3: Verify Environment Variables

In Supabase Dashboard → Edge Functions → Settings:
- `SUPABASE_URL` should be set
- `SUPABASE_SERVICE_ROLE_KEY` should be set

### Step 4: Check Console Logs

After clicking "Login with OTP", check browser console for:
```
[AUTH] Sending OTP to: [phone] mode: login
[AUTH] Functions URL: https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1
[AUTH] Response status: [status code]
[AUTH] Response data: [response data]
```

---

## Common Issues & Solutions

### Issue 1: Edge Function Not Deployed

**Symptoms**: Error "Authenticate" or 404

**Solution**:
```bash
# Deploy the edge function
supabase functions deploy customer-send-otp --project-ref ijfgikkpiirepmjyvidl
```

### Issue 2: Wrong Authorization Headers

**Symptoms**: 401 or 403 errors

**Solution**: Verify the headers in `auth.service.ts`:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
  'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
}
```

### Issue 3: CORS Issues

**Symptoms**: Network errors or CORS errors in console

**Solution**: Verify CORS headers in edge function:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Issue 4: Environment Variables Not Set

**Symptoms**: Edge function returns 500 error

**Solution**: Set environment variables in Supabase Dashboard:
- Go to Edge Functions → Settings
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

## Testing the Fix

1. **Open browser console** (F12)
2. **Click "Login with OTP"**
3. **Check console logs**:
   - Should see: `[AUTH] Sending OTP to: [phone]`
   - Should see: `[AUTH] Response status: 200` (if successful)
   - Should see: `[AUTH] OTP sent successfully`
4. **If error occurs**:
   - Check the response status code
   - Check the error message
   - Follow the troubleshooting steps above

---

## Manual Testing

### Test Edge Function Directly

```bash
# Replace YOUR_ANON_KEY with your actual anon key
curl -X POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmdpa2twaWlyZXBtanl2aWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ3NDUsImV4cCI6MjA3Njk0MDc0NX0.vuDAO3CUf-QF02hHUMn3VhNP5tMUPg4KG4WCuTd5Oqk" \
  -d '{"phone": "+911234567890"}'
```

**Expected Response** (success):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"
}
```

**Expected Response** (error):
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Edge function `customer-send-otp` is deployed
- [ ] Environment variables are set in Supabase
- [ ] Edge function is accessible (test with curl)
- [ ] CORS headers are correct
- [ ] Authorization headers are correct
- [ ] Error handling is working
- [ ] Console logs are helpful for debugging

---

## Files Modified

1. **`lib/auth.service.ts`**
   - Enhanced error handling
   - Better logging
   - Non-JSON response handling

2. **`app/auth/login.tsx`**
   - Improved user-facing error messages
   - Retry functionality
   - Better error alerts

---

## Next Steps

1. **Deploy Edge Function** (if not already deployed):
   ```bash
   supabase functions deploy customer-send-otp
   ```

2. **Test the Function**:
   - Use the curl command above
   - Or test through the app UI

3. **Check Logs**:
   - Supabase Dashboard → Edge Functions → Logs
   - Browser console logs

4. **Verify Configuration**:
   - Environment variables
   - Function URL
   - Authorization headers

---

## Status

✅ **Error Handling Improved** - Better logging and user messages
⏳ **Needs Verification** - Edge function deployment status
⏳ **Needs Testing** - Test with actual deployment

---

**Priority**: 🔴 **CRITICAL**
**Status**: ⚠️ **REQUIRES EDGE FUNCTION DEPLOYMENT**


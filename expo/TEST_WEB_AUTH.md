# Web Authentication Testing Guide

## Issue Fixed
Users were not getting authenticated on web despite successful OTP verification. The edge function logs showed success but the app state wasn't updating properly.

## Root Cause
The `login` function in `AuthContext` was using stale closures for helper functions, preventing wallet and referral data from loading after successful authentication.

## Test Checklist

### 1. Fresh Login Flow (New User)
- [ ] Open web app in incognito/private browsing mode
- [ ] Click login/signup
- [ ] Enter mobile number (use test number if available)
- [ ] Receive OTP
- [ ] Enter OTP
- [ ] **Expected**: Redirected to home page, user is authenticated
- [ ] **Verify**: Check browser console for these logs:
  ```
  [AUTH] Login successful for user: <uuid>
  [AuthContext] Logging in user: <uuid>
  [AuthContext] Loading wallet data for user: <uuid>
  [AuthContext] Wallet loaded: <virtualBalance> <actualBalance>
  [AuthContext] Loading referral stats for user: <uuid>
  [AuthContext] Referral stats loaded: <lifetimeEarnings>
  [AuthContext] Setting up real-time subscriptions for user: <uuid>
  ```
- [ ] Navigate to wallet page
- [ ] **Expected**: Wallet balance displays correctly (not ₹0 if user has balance)
- [ ] Navigate to profile page
- [ ] **Expected**: User details display correctly

### 2. Returning User Flow (Session Persistence)
- [ ] After completing fresh login test, close the browser tab
- [ ] Reopen the web app in a new tab (same browser session)
- [ ] **Expected**: User is automatically logged in
- [ ] **Verify**: Check browser console for:
  ```
  [AuthContext] Loading stored data
  [AuthContext] Found stored session, loading profile
  [AuthContext] Loading wallet data for user: <uuid>
  [AuthContext] Wallet loaded: <virtualBalance> <actualBalance>
  ```
- [ ] Check localStorage in DevTools (Application tab):
  - [ ] Look for key: `@heko_session`
  - [ ] Verify it contains: `{"user":{...},"token":"..."}`

### 3. Guest → Login Flow
- [ ] Open web app in incognito mode (fresh session)
- [ ] Browse products without logging in
- [ ] Add items to cart
- [ ] Try to checkout
- [ ] **Expected**: Login modal/screen appears
- [ ] Complete login with OTP
- [ ] **Expected**: 
  - User is authenticated
  - Cart items are preserved
  - Checkout proceeds normally
- [ ] **Verify**: Wallet data loads correctly after login

### 4. Cross-Tab Session Sync
- [ ] Login in Tab 1
- [ ] Open web app in Tab 2 (same browser)
- [ ] **Expected**: Tab 2 shows user as logged in (may require refresh)
- [ ] Logout in Tab 1
- [ ] Refresh Tab 2
- [ ] **Expected**: Tab 2 shows user as logged out

### 5. Realtime Updates Test
- [ ] Login and navigate to wallet page
- [ ] Have an admin or another service create a new wallet transaction for the user
- [ ] **Expected**: Wallet updates automatically without page refresh
- [ ] **Verify**: Check console for:
  ```
  [AuthContext] New wallet transaction: <transaction_data>
  [AuthContext] Error reloading wallet: <if any error>
  ```

### 6. Network Error Handling
- [ ] Open DevTools → Network tab
- [ ] Set network throttling to "Slow 3G"
- [ ] Try to login
- [ ] **Expected**: Loading state is shown
- [ ] Wait for OTP verification to complete
- [ ] **Expected**: Eventually succeeds or shows appropriate error

### 7. Invalid/Expired Session
- [ ] Login successfully
- [ ] Open browser DevTools → Application → Local Storage
- [ ] Find `@heko_session` key
- [ ] Modify the token value to something invalid
- [ ] Refresh the page
- [ ] **Expected**: 
  - Console shows: `[AUTH] Session validation failed, clearing stored session`
  - User is logged out
  - No errors in console

### 8. Mobile vs Web Comparison
- [ ] Test the same login flow on mobile app
- [ ] Compare console logs
- [ ] **Expected**: Both should show similar authentication flow logs
- [ ] Verify wallet and referral data load correctly on both platforms

## Common Issues to Watch For

### ❌ Symptoms of Old Bug (Should NOT Occur)
- User appears logged in but wallet shows ₹0
- Console shows no wallet loading logs after login
- Referral stats don't load
- Realtime subscriptions don't work

### ✅ Signs of Successful Fix
- Console shows complete authentication flow logs
- Wallet balance loads correctly from database
- Referral stats load correctly
- User state persists across page refreshes
- Realtime updates work correctly

## Debug Commands

### Check localStorage
Open browser console and run:
```javascript
console.log(localStorage.getItem('@heko_session'));
```

### Clear session and test fresh login
```javascript
localStorage.clear();
location.reload();
```

### Monitor realtime subscriptions
```javascript
// Check if Supabase channels are connected
window.supabase?.getChannels?.();
```

## Expected Console Log Flow

### On Fresh Login:
```
[AUTH] Verifying OTP for login: +91XXXXXXXXXX
[AUTH] Login successful for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Logging in user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Loading wallet data for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Wallet loaded: 4175 555
[AuthContext] Loading referral stats for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Referral stats loaded: 0
[AuthContext] Setting up real-time subscriptions for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### On Page Reload (Stored Session):
```
[AuthContext] Loading stored data
[AUTH] Session validated successfully
[AuthContext] Found stored session, loading profile
[AuthContext] Loading wallet data for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Wallet loaded: 4175 555
[AuthContext] Loading referral stats for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AuthContext] Referral stats loaded: 0
[AuthContext] Setting up real-time subscriptions for user: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Report Issues

If any test fails:
1. Capture the full console log
2. Note which test case failed
3. Check browser DevTools → Application → Local Storage
4. Check Network tab for failed requests
5. Document the exact steps to reproduce

---

**Status**: Ready for testing
**Last Updated**: After fixing AuthContext stale closure bug


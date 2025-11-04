# Web Authentication Fix

## Issue Summary
Users were unable to authenticate on the web app despite successful OTP verification. The edge function logs showed success status, but users weren't getting authenticated in the application.

## Root Cause
The issue was in `/contexts/AuthContext.tsx`. The `login` function was using `useCallback` with an empty dependency array `[]`, but it was calling three helper functions (`loadWalletData`, `loadReferralStats`, `setupRealtimeSubscriptions`) that had been recently converted from `useCallback` to regular functions.

### Technical Details
When you convert a function from `useCallback` to a regular function, it gets recreated on every render. If another `useCallback` function references it with an empty dependency array, it captures a stale version from the first render, which doesn't exist properly in the closure scope.

This created a scenario where:
1. User successfully verifies OTP → Edge function returns success ✅
2. `authService.verifyOTPLogin()` stores session in AsyncStorage ✅
3. Calls `await login(result.user, result.token)` ✅
4. `login` function sets user/token state ✅
5. `login` tries to call `loadWalletData()`, `loadReferralStats()`, `setupRealtimeSubscriptions()` ❌
6. These functions fail silently because they're stale closures
7. User state is partially set but wallet/referral data never loads
8. App appears "authenticated" but broken

## Solution
Refactored the `login` function to inline all the wallet and referral loading logic directly instead of depending on external helper functions. This ensures the login flow is self-contained and doesn't rely on potentially stale closures.

### Changes Made
1. **Inlined wallet loading logic** in the `login` function (lines 225-267)
2. **Inlined referral stats loading logic** in the `login` function (lines 269-300)
3. **Inlined wallet loading logic** in the `loadStoredData` function (lines 71-146)
4. **Inlined wallet reload logic** in the realtime subscription for wallet transactions (lines 209-247)
5. **Removed unused helper functions** `loadWalletData` and `loadReferralStats`
6. Kept `setupRealtimeSubscriptions` as a helper but made it self-contained with inlined logic

## Files Modified
- `/contexts/AuthContext.tsx`: Refactored the `login` function and `setupRealtimeSubscriptions`

## Testing Recommendations
1. Test login flow on web browser
2. Verify wallet balance loads correctly after login
3. Verify referral stats load correctly after login
4. Test realtime updates for wallet transactions
5. Test on mobile to ensure no regressions

## Prevention
When using `useCallback` in React/React Native:
- Always include all dependencies in the dependency array
- OR inline the logic if the function is simple enough
- OR ensure helper functions are also stable (wrapped in `useCallback` with proper dependencies)
- Never use empty dependency arrays `[]` unless the function truly has no external dependencies


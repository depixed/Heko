# OTP Provider Flow Separation - Complete

## 🎯 Overview

This document explains how the OTP flows are completely separated to ensure only the active provider (Fast2SMS or MSG91) is executed.

---

## ✅ Current State: Fast2SMS Only

### What's Active
- ✅ **Backend API calls only** (Fast2SMS via Supabase Edge Functions)
- ✅ **6-digit OTP** support
- ✅ **Direct verification** flow

### What's Disabled
- ❌ **MSG91 SDK initialization** - Completely disabled
- ❌ **ExposeOTPVerification component** - Not rendered
- ❌ **MSG91 ref handling** - Commented out
- ❌ **MSG91 SDK methods** - Bypassed with early returns

---

## 🔄 Complete Flow Diagram

### Fast2SMS Flow (Current - Active)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ENTERS PHONE                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  app/auth/login.tsx                                         │
│  - handleOTPLogin()                                         │
│  - Calls: authService.sendOTP(phone, 'login')              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  lib/auth.service.ts                                        │
│  - sendOTP()                                                │
│  - Calls: msg91Service.sendOtp(phone)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  lib/msg91.service.ts                                       │
│  - sendOtp()                                                │
│  - LOG: "Using backend API (Fast2SMS) - MSG91 SDK bypassed"│
│  - Returns: this.sendOtpViaBackend(phone)                  │
│  - NO MSG91 SDK CALLS                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  sendOtpViaBackend()                                        │
│  - Formats phone to 10 digits                               │
│  - POST to /customer-send-otp                               │
│  - Backend uses Fast2SMS API                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: customer-send-otp                  │
│  - Checks OTP_PROVIDER env var                              │
│  - IF Fast2SMS:                                             │
│    • Generate 6-digit OTP                                   │
│    • Store in otp_verifications table                       │
│    • Call Fast2SMS API to send SMS                          │
│  - IF MSG91: (not executed)                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Fast2SMS API                                               │
│  - Sends SMS with 6-digit OTP                               │
│  - Returns delivery status                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  USER RECEIVES SMS                                          │
│  - 6-digit OTP                                              │
└─────────────────────────────────────────────────────────────┘
```

### Verification Flow (Fast2SMS)

```
┌─────────────────────────────────────────────────────────────┐
│  USER ENTERS 6-DIGIT OTP                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  app/auth/otp.tsx                                           │
│  - handleVerifyOTP()                                        │
│  - Direct backend API call (NO msg91Service)                │
│  - POST to /customer-verify-otp                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: customer-verify-otp                │
│  - Checks OTP_PROVIDER env var                              │
│  - IF Fast2SMS:                                             │
│    • Look up OTP in otp_verifications table                 │
│    • Validate OTP, expiry, attempts                         │
│    • Check if user exists in profiles                       │
│    • Return user status                                     │
│  - IF MSG91: (not executed)                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Response to Frontend                                       │
│  - isNewUser: true/false                                    │
│  - sessionToken (if existing user)                          │
│  - user data (if existing user)                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Decision                                          │
│  - New user: Show profile form                              │
│  - Existing user: Login and go to home                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚫 MSG91 Flow (Disabled)

### What's NOT Executed

#### 1. **NO Component Rendering**
```typescript
// app/_layout.tsx - Line 151
{/* DISABLED: Using Fast2SMS via backend API - MSG91 SDK not needed */}
{/* ExposeOTPVerification component NOT RENDERED */}
```

#### 2. **NO SDK Initialization**
```typescript
// app/_layout.tsx - Line 36
// DISABLED: MSG91 SDK initialization
// useEffect() commented out
// No msg91Service.initialize() call
```

#### 3. **NO Ref Handling**
```typescript
// app/_layout.tsx - Line 31
// const exposeOTPRef - COMMENTED OUT
// setExposeOTPRef() - COMMENTED OUT
```

#### 4. **NO SDK Methods Called**
```typescript
// lib/msg91.service.ts - Line 94
async sendOtp(phone: string): Promise<void> {
  // Early return - MSG91 SDK code never reached
  return this.sendOtpViaBackend(phone);
  
  // MSG91 SDK code below is unreachable
  // if (Platform.OS === 'web') { ... }
  // if (!this.exposeRef) { ... }
  // await this.exposeRef.sendOtp(...) // NEVER EXECUTED
}
```

---

## 🔍 Verification Checklist

### How to Verify Only Fast2SMS is Used

1. **Check Console Logs:**
```
[OTP Service] Using backend API (Fast2SMS) - MSG91 SDK bypassed
[OTP] Sending OTP via backend
[OTP] OTP sent successfully via FAST2SMS
[OTP Service] Verifying OTP via backend API (Fast2SMS) - MSG91 SDK bypassed
[OTP] OTP verified successfully via FAST2SMS
```

2. **No MSG91 SDK Logs:**
```
// These should NOT appear:
❌ [MSG91] Service initialized
❌ [MSG91] Ref set
❌ [MSG91] Sending OTP via SDK
❌ [MSG91] Widget data received
```

3. **Backend Logs (Supabase):**
```
✅ customer-send-otp: Using provider: FAST2SMS
✅ Generated 6-digit OTP
✅ Stored in otp_verifications table
✅ Fast2SMS API called
✅ customer-verify-otp: Verifying via FAST2SMS
✅ OTP found in database
```

4. **Network Requests:**
```
✅ POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-send-otp
✅ POST https://ijfgikkpiirepmjyvidl.supabase.co/functions/v1/customer-verify-otp
❌ NO requests to control.msg91.com (MSG91 API)
```

---

## 📊 Code Changes Summary

### Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `app/_layout.tsx` | Commented out ExposeOTPVerification component | Disable MSG91 SDK rendering |
| `app/_layout.tsx` | Commented out MSG91 initialization | Prevent SDK initialization |
| `app/_layout.tsx` | Commented out ref handling | Remove MSG91 ref management |
| `app/auth/otp.tsx` | Commented out MSG91 initialization | Skip initialization on OTP screen |
| `lib/msg91.service.ts` | Added early return in sendOtp() | Bypass MSG91 SDK completely |
| `lib/msg91.service.ts` | Added early return in verifyOtp() | Bypass MSG91 SDK completely |
| `lib/msg91.service.ts` | Added console logs | Show which provider is active |

---

## 🔄 Switching Back to MSG91

When DLT approval is complete:

### 1. Backend (1 change)
```bash
supabase secrets set OTP_PROVIDER=MSG91
```

### 2. Frontend (3 files)

#### A. `app/_layout.tsx`
```typescript
// Uncomment lines 36-42 (MSG91 initialization)
// Uncomment lines 44-50 (setExposeOTPRef callback)
// Uncomment lines 151-159 (ExposeOTPVerification component)
// Uncomment line 31 (exposeOTPRef ref)
```

#### B. `lib/msg91.service.ts`
```typescript
// In sendOtp() - Remove early return (line 97)
// Uncomment MSG91 SDK code block (lines 101-150)

// In verifyOtp() - Remove early return (line 238)
// Uncomment MSG91 SDK code block (lines 242-308)
```

#### C. `app/auth/otp.tsx`
```typescript
// Change OTP length from 6 to 4 (lines 42, 47)
// Restore 2-step verification (lines 59-86)
// Uncomment MSG91 initialization (lines 25-30)
```

#### D. `constants/config.ts`
```typescript
// Change OTP.LENGTH from 6 to 4
```

---

## 🎯 Benefits of This Approach

### 1. **Complete Separation**
- ✅ No cross-contamination between providers
- ✅ Only active provider code executes
- ✅ No unnecessary SDK loading

### 2. **Performance**
- ✅ No MSG91 SDK bundle in production
- ✅ Smaller app size
- ✅ Faster initialization

### 3. **Debugging**
- ✅ Clear console logs showing active provider
- ✅ Easy to trace OTP flow
- ✅ No confusion about which provider is used

### 4. **Easy Rollback**
- ✅ All MSG91 code preserved
- ✅ Commented out, not deleted
- ✅ Can switch back in 15 minutes

---

## 🧪 Testing Scenarios

### Test 1: OTP Send
**Expected:**
- ✅ Console log: "Using backend API (Fast2SMS)"
- ✅ Backend log: "Using provider: FAST2SMS"
- ✅ SMS received with 6-digit OTP
- ❌ NO MSG91 SDK logs

### Test 2: OTP Verify
**Expected:**
- ✅ Console log: "Verifying OTP via backend API (Fast2SMS)"
- ✅ Backend log: "Verifying via FAST2SMS"
- ✅ Verification from database
- ❌ NO MSG91 SDK logs

### Test 3: Component Loading
**Expected:**
- ❌ NO ExposeOTPVerification rendered
- ❌ NO MSG91 initialization logs
- ❌ NO MSG91 ref set logs
- ✅ App loads faster

### Test 4: Network Requests
**Expected:**
- ✅ Only Supabase Edge Function calls
- ❌ NO direct MSG91 API calls from app
- ✅ Fast2SMS called from backend only

---

## 📝 Important Notes

1. **MSG91 SDK Package**: Still installed but not used/loaded
2. **ExposeOTPVerification**: Not rendered, so no native module loaded
3. **Backend Provider Toggle**: Controlled by `OTP_PROVIDER` env var only
4. **No Hybrid Flow**: Either 100% Fast2SMS or 100% MSG91, never mixed
5. **Clean Logs**: Easy to identify which provider is active

---

## ✅ Verification Commands

### Check Active Provider (Console)
```javascript
// Should see in browser console or React Native logs:
[OTP Service] Using backend API (Fast2SMS) - MSG91 SDK bypassed
```

### Check Backend Provider (Supabase SQL)
```sql
-- Check recent OTPs
SELECT phone, otp, created_at, verified 
FROM otp_verifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check Network Requests (Browser DevTools)
```
Network tab → Filter by "customer"
Should see:
✅ customer-send-otp
✅ customer-verify-otp
Should NOT see:
❌ control.msg91.com
```

---

**Status:** ✅ **COMPLETE SEPARATION ACHIEVED**

**Provider:** Fast2SMS (Backend API only)  
**MSG91 SDK:** Completely disabled  
**Last Updated:** January 6, 2025


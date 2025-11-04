# Authentication Flow Diagram

## Before Fix (Broken) ❌

```
User enters OTP
    ↓
authService.verifyOTPLogin(phone, otp)
    ↓
Edge Function validates OTP ✅
    ↓
Returns: { success: true, user, token }
    ↓
await login(user, token)
    ↓
login() function called
    ├─ setUser(user) ✅
    ├─ setToken(token) ✅
    ├─ await loadWalletData(userId) ❌ STALE CLOSURE
    ├─ await loadReferralStats(userId) ❌ STALE CLOSURE
    └─ setupRealtimeSubscriptions(userId) ⚠️ PARTIAL
    ↓
Result:
├─ User state set ✅
├─ Token state set ✅
├─ Wallet data NOT loaded ❌
├─ Referral stats NOT loaded ❌
└─ Realtime subscriptions broken ⚠️
    ↓
User appears "logged in" but:
├─ Wallet shows ₹0 (should show actual balance)
├─ No console logs for wallet loading
└─ Data loading failed silently
```

## After Fix (Working) ✅

```
User enters OTP
    ↓
authService.verifyOTPLogin(phone, otp)
    ↓
Edge Function validates OTP ✅
    ↓
Returns: { success: true, user, token }
    ↓
await login(user, token)
    ↓
login() function with inlined logic
    ├─ setUser(user) ✅
    ├─ setToken(token) ✅
    │
    ├─ INLINE: Load Wallet Data
    │   ├─ await walletService.getWalletBalance(userId)
    │   ├─ await walletService.getTransactions(userId)
    │   ├─ Process transactions
    │   └─ setWallet({ virtualBalance, actualBalance, transactions }) ✅
    │
    ├─ INLINE: Load Referral Stats
    │   ├─ await supabase.from('referral_conversions').select()
    │   ├─ Process conversions
    │   └─ setReferralStats({ totalReferred, earnings, ... }) ✅
    │
    └─ setupRealtimeSubscriptions(userId) ✅
        ├─ Profile updates subscription ✅
        └─ Wallet transactions subscription ✅
    ↓
Result:
├─ User state set ✅
├─ Token state set ✅
├─ Wallet data loaded ✅
├─ Referral stats loaded ✅
└─ Realtime subscriptions active ✅
    ↓
User successfully authenticated:
├─ Wallet shows correct balance ✅
├─ Console logs show data loading ✅
├─ All features work correctly ✅
└─ Session persists on reload ✅
```

## Session Persistence Flow ✅

```
User closes browser
    ↓
localStorage contains:
    '@heko_session' = {
        user: { id, name, phone, ... },
        token: "uuid-session-token"
    }
    ↓
User reopens browser
    ↓
App loads → AuthContext initializes
    ↓
loadStoredData() runs
    ├─ Read '@heko_session' from localStorage ✅
    ├─ Call authService.getStoredSession()
    │   └─ Validates token with edge function ✅
    │
    ├─ setUser(user) ✅
    ├─ setToken(token) ✅
    │
    ├─ INLINE: Load Wallet Data ✅
    ├─ INLINE: Load Referral Stats ✅
    └─ setupRealtimeSubscriptions(userId) ✅
    ↓
User automatically logged in ✅
```

## Realtime Updates Flow ✅

```
User is logged in and viewing wallet
    ↓
setupRealtimeSubscriptions(userId) active
    ├─ Listening: wallet_transactions INSERT events
    └─ Listening: profiles UPDATE events
    ↓
New transaction added to database
    ↓
Supabase triggers realtime event
    ↓
walletSubscription callback fires
    ├─ Log: "New wallet transaction: <data>"
    │
    └─ INLINE: Reload Wallet Data
        ├─ await walletService.getWalletBalance(userId)
        ├─ await walletService.getTransactions(userId)
        └─ setWallet({ updated data }) ✅
    ↓
Wallet UI updates automatically ✅
(No page refresh needed)
```

## Key Differences

### Before (Broken)
- Helper functions recreated on every render
- `login()` used stale references to helpers
- Data loading silently failed
- Empty dependency array `[]` caused stale closures

### After (Fixed)
- Logic inlined directly in callbacks
- No external function dependencies
- All data loads successfully
- Self-contained, predictable execution

## Architecture Decisions

### Why Inline Instead of Fixing Dependencies?

**Option 1: Fix Dependencies (Not Chosen)**
```typescript
const loadWalletData = useCallback(async (userId: string) => {
  // ... logic ...
}, [/* many dependencies */]);

const login = useCallback(async (userData, token) => {
  await loadWalletData(userData.id);
}, [loadWalletData]); // Must include dependency
```
❌ Complex dependency chain  
❌ Easy to break  
❌ Multiple re-renders  

**Option 2: Inline Logic (Chosen)**
```typescript
const login = useCallback(async (userData, token) => {
  // All logic here
  const balanceResult = await walletService.getWalletBalance(userData.id);
  // ...
}, []); // No dependencies needed
```
✅ Self-contained  
✅ No stale closures  
✅ Easy to debug  
✅ Predictable behavior  

## Console Log Timeline (Success)

```
T+0ms:  [AUTH] Verifying OTP for login: +91XXXXXXXXXX
T+200ms: [AUTH] Login successful for user: xxxx-uuid
T+201ms: [AuthContext] Logging in user: xxxx-uuid
T+202ms: [AuthContext] Loading wallet data for user: xxxx-uuid
T+450ms: [AuthContext] Wallet loaded: 4175 555
T+451ms: [AuthContext] Loading referral stats for user: xxxx-uuid
T+600ms: [AuthContext] Referral stats loaded: 0
T+601ms: [AuthContext] Setting up real-time subscriptions for user: xxxx-uuid
T+602ms: [Navigation] Redirecting to /(tabs)/
```

If these logs don't appear, the authentication flow failed.

---

**Visual Summary**

```
OLD:  login() → stale helpers → ❌ data not loaded
NEW:  login() → inline logic → ✅ data loaded
```


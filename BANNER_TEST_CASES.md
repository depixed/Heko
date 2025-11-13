# Banner Implementation - Test Cases & Validation

## Phase 9: Testing & Validation

### 9.1 Banner Display Tests

#### Test Case 1.1: Banners Load on Home Screen
**Objective**: Verify banners are fetched and displayed on the home screen

**Steps**:
1. Open the app and navigate to home screen
2. Wait for banners to load
3. Verify banners are displayed in carousel format

**Expected Results**:
- Banners appear within 2-3 seconds
- Carousel shows pagination dots if multiple banners
- No loading spinner after banners load
- Images load properly without broken image icons

**Test Data**:
- Use test banners from admin panel
- Test with 0, 1, 3, and 5+ banners

---

#### Test Case 1.2: Carousel Auto-Play
**Objective**: Verify carousel automatically advances through banners

**Steps**:
1. Navigate to home screen with multiple banners
2. Observe carousel without interaction
3. Wait for auto-play interval (5 seconds)

**Expected Results**:
- Carousel automatically scrolls to next banner after 5 seconds
- Pagination dots update to reflect current banner
- Auto-play pauses when user manually scrolls
- Auto-play resumes after user stops scrolling

**Test Data**:
- Minimum 2 banners required
- Verify with 3+ banners for full cycle

---

#### Test Case 1.3: Pagination Works
**Objective**: Verify pagination dots and manual scrolling

**Steps**:
1. Navigate to home screen with multiple banners
2. Swipe left/right on carousel
3. Tap pagination dots (if implemented)

**Expected Results**:
- Swiping changes active banner
- Pagination dots reflect current banner index
- Smooth scrolling animation
- No janky or stuttering animations

---

#### Test Case 1.4: Images Load Properly
**Objective**: Verify banner images load and display correctly

**Steps**:
1. Navigate to home screen
2. Observe banner images
3. Test with slow network (throttle in DevTools)

**Expected Results**:
- Images load progressively (no broken images)
- Proper aspect ratio maintained
- Images are optimized and not pixelated
- Loading states handled gracefully

---

### 9.2 Targeting Tests

#### Test Case 2.1: New User Banners
**Objective**: Verify banners targeted to new users display correctly

**Steps**:
1. Log out of the app
2. Clear app data/cache
3. Open app as new user
4. Navigate to home screen

**Expected Results**:
- New user specific banners are displayed
- Logged-in only banners are hidden
- Targeting works based on user status

**Test Data**:
- Create test banner with `target_new_users: true`
- Create test banner with `target_logged_in: true`

---

#### Test Case 2.2: Logged-In Only Banners
**Objective**: Verify logged-in banners are hidden when logged out

**Steps**:
1. Log out of the app
2. Navigate to home screen
3. Verify banner display
4. Log in
5. Navigate to home screen again

**Expected Results**:
- Logged-out: Only public/new user banners shown
- Logged-in: All eligible banners shown including logged-in only
- No errors when switching between states

---

#### Test Case 2.3: City-Specific Banners
**Objective**: Verify city-based banner filtering

**Steps**:
1. Set address in Mumbai
2. Navigate to home screen
3. Note displayed banners
4. Change address to Delhi
5. Navigate to home screen again

**Expected Results**:
- Mumbai-specific banners shown when address is Mumbai
- Delhi-specific banners shown when address is Delhi
- City-agnostic banners shown in both cases
- Banners refresh when address changes

**Test Data**:
- Create banners with `target_cities: ['Mumbai']`
- Create banners with `target_cities: ['Delhi']`
- Create banners with no city targeting

---

#### Test Case 2.4: App Version Filtering
**Objective**: Verify banners filter based on app version

**Steps**:
1. Check current app version in config
2. Create banner with version requirement
3. Navigate to home screen
4. Verify banner display

**Expected Results**:
- Banners with matching version requirements shown
- Banners with incompatible versions hidden
- Version comparison works correctly (semver)

**Test Data**:
- Create banner with `min_app_version: '1.0.0'`
- Create banner with `min_app_version: '2.0.0'` (should not show)

---

### 9.3 Analytics Tests

#### Test Case 3.1: Impression Tracking
**Objective**: Verify impressions are tracked after 1s visibility

**Steps**:
1. Navigate to home screen
2. Wait for banner to be visible
3. Keep banner visible for >1 second
4. Check analytics/logs

**Expected Results**:
- Impression tracked after banner is 50% visible for 1 second
- Only one impression per banner per session
- Metadata includes: user_id, session_id, city, app_version, device_type
- Tracking fails gracefully offline (no errors)

**Verification**:
- Check network requests for `track-banner-impression`
- Verify request payload contains correct metadata
- Check analytics dashboard for impression data

---

#### Test Case 3.2: Click Tracking
**Objective**: Verify clicks are tracked on banner tap

**Steps**:
1. Navigate to home screen
2. Tap on a banner
3. Check analytics/logs

**Expected Results**:
- Click tracked immediately on tap
- Metadata includes: user_id, session_id, city, app_version, device_type, banner_position
- Navigation proceeds even if tracking fails
- No duplicate clicks tracked

**Verification**:
- Check network requests for `track-banner-click`
- Verify request payload contains correct metadata
- Check analytics dashboard for click data

---

#### Test Case 3.3: Metadata Sent Correctly
**Objective**: Verify all metadata is sent with tracking events

**Steps**:
1. Log in as user
2. Set address with city
3. Navigate to home screen
4. Interact with banners
5. Check tracking payloads

**Expected Results**:
- `user_id`: Present when logged in, null when logged out
- `session_id`: Always present
- `city`: Present when address is set
- `app_version`: Always present (from config)
- `device_type`: Always present ('ios', 'android', 'web')
- `banner_position`: Present in click events
- `carousel_length`: Present in click events

---

### 9.4 Offline Mode Tests

#### Test Case 4.1: Cached Banners Display Offline
**Objective**: Verify cached banners show when offline

**Steps**:
1. Navigate to home screen (online)
2. Wait for banners to load
3. Enable airplane mode / disable network
4. Navigate away and back to home screen

**Expected Results**:
- Cached banners displayed immediately
- No loading spinner
- No error messages
- User experience unchanged

---

#### Test Case 4.2: No Errors When Tracking Fails Offline
**Objective**: Verify tracking failures don't break the app

**Steps**:
1. Enable airplane mode
2. Navigate to home screen
3. Tap on banners
4. Check console/logs

**Expected Results**:
- No errors thrown
- Tracking attempts fail silently
- Navigation still works
- App remains functional

---

#### Test Case 4.3: Cache Refreshes When Back Online
**Objective**: Verify banners refresh when connection restored

**Steps**:
1. Load banners offline (from cache)
2. Enable network connection
3. Wait for background refresh
4. Verify banners update

**Expected Results**:
- Banners refresh in background
- New banners replace cached ones
- No user interruption
- Cache updated with fresh data

---

### 9.5 Deep Link Tests

#### Test Case 5.1: Category Links Navigate Correctly
**Objective**: Verify category deep links work

**Steps**:
1. Create banner with category deep link: `heko://category?groceries`
2. Navigate to home screen
3. Tap banner

**Expected Results**:
- Navigates to category page
- Correct category displayed
- No errors

**Test Data**:
- `heko://category?groceries`
- `heko://category/123`
- `heko://category?category_id=123`

---

#### Test Case 5.2: Product Links Open Detail Page
**Objective**: Verify product deep links work

**Steps**:
1. Create banner with product deep link: `heko://product?product_id=123`
2. Navigate to home screen
3. Tap banner

**Expected Results**:
- Navigates to product detail page
- Correct product displayed
- No errors

**Test Data**:
- `heko://product?product_id=123`
- `heko://product/123`

---

#### Test Case 5.3: External URLs Open in Browser
**Objective**: Verify external URLs open correctly

**Steps**:
1. Create banner with external URL: `https://example.com`
2. Navigate to home screen
3. Tap banner

**Expected Results**:
- External URL opens in browser/app browser
- No navigation errors
- App remains in background

---

#### Test Case 5.4: Invalid Links Fail Gracefully
**Objective**: Verify invalid deep links don't crash app

**Steps**:
1. Create banner with invalid deep link: `heko://invalid/route`
2. Navigate to home screen
3. Tap banner

**Expected Results**:
- No crash
- Error logged to console
- User sees no error (graceful failure)
- App remains functional

**Test Data**:
- `heko://invalid/route`
- `invalid://format`
- Empty string
- `null` or `undefined`

---

### 9.6 Performance Tests

#### Test Case 6.1: Low-End Device Performance
**Objective**: Verify banners perform well on low-end devices

**Steps**:
1. Test on low-end device or simulator
2. Navigate to home screen
3. Monitor performance metrics

**Expected Results**:
- Banners load within 3 seconds
- Smooth scrolling (60fps)
- No memory leaks
- No excessive battery drain

---

#### Test Case 6.2: Multiple Banners Performance
**Objective**: Verify performance with many banners

**Steps**:
1. Create 10+ banners in admin
2. Navigate to home screen
3. Monitor performance

**Expected Results**:
- All banners load efficiently
- Lazy loading works for off-screen banners
- Smooth carousel scrolling
- No performance degradation

---

### 9.7 Edge Cases

#### Test Case 7.1: Zero Banners
**Objective**: Verify app handles zero banners gracefully

**Steps**:
1. Ensure no active banners in admin
2. Navigate to home screen

**Expected Results**:
- No banner section displayed
- No errors
- Home screen renders normally
- No empty space or placeholder

---

#### Test Case 7.2: Expired Banners
**Objective**: Verify expired banners are not shown

**Steps**:
1. Create banner with past `end_at` date
2. Navigate to home screen

**Expected Results**:
- Expired banner not displayed
- Only active banners shown
- No errors

---

#### Test Case 7.3: Future Banners
**Objective**: Verify future banners are not shown

**Steps**:
1. Create banner with future `start_at` date
2. Navigate to home screen

**Expected Results**:
- Future banner not displayed
- Only active banners shown
- No errors

---

## Test Execution Checklist

- [ ] All banner display tests pass
- [ ] All targeting tests pass
- [ ] All analytics tests pass
- [ ] All offline mode tests pass
- [ ] All deep link tests pass
- [ ] All performance tests pass
- [ ] All edge cases pass
- [ ] Cross-platform testing (iOS, Android, Web)
- [ ] Accessibility testing completed
- [ ] Error logging verified

---

## Test Data Setup

### Required Test Banners

1. **Public Banner** (no targeting)
   - `target_new_users: false`
   - `target_logged_in: false`
   - `target_cities: []`

2. **New User Banner**
   - `target_new_users: true`
   - `target_logged_in: false`

3. **Logged-In Only Banner**
   - `target_logged_in: true`

4. **City-Specific Banner**
   - `target_cities: ['Mumbai']`

5. **Category Deep Link Banner**
   - `deeplink: 'heko://category?groceries'`

6. **Product Deep Link Banner**
   - `deeplink: 'heko://product?product_id=123'`

7. **External URL Banner**
   - `deeplink: 'https://example.com'`

8. **Invalid Deep Link Banner**
   - `deeplink: 'heko://invalid/route'`

---

## Monitoring & Validation

### Key Metrics to Monitor

1. **Banner Load Success Rate**: Should be >95%
2. **Impression Tracking Rate**: Should be >90%
3. **Click Tracking Rate**: Should be >95%
4. **Cache Hit Rate**: Should be >70%
5. **API Error Rate**: Should be <5%
6. **Image Load Failure Rate**: Should be <2%

### Validation Queries

```sql
-- Check impression tracking
SELECT COUNT(*) FROM banner_impressions 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check click tracking
SELECT COUNT(*) FROM banner_clicks 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check error rates
SELECT COUNT(*) FROM banner_tracking_errors 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Notes

- All tests should be run on both development and production environments
- Test with real banner data from admin panel
- Verify analytics data appears in dashboard
- Test with various network conditions (fast, slow, offline)
- Test with different user states (logged in, logged out, new user)
- Test with different locations/cities


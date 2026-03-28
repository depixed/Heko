# Banner Implementation - Deployment Checklist

## Phase 10: Deployment Checklist

### 10.1 Pre-Launch Checklist

#### ✅ Banner Data Setup
- [ ] Create test banners in admin panel
- [ ] Verify banner images are uploaded and accessible
- [ ] Set up banner targeting rules (new users, logged-in, city-specific)
- [ ] Configure banner date ranges (start_at, end_at)
- [ ] Set banner priorities correctly
- [ ] Test with various banner counts (0, 1, 5+)

#### ✅ API Endpoints Verification
- [ ] Verify `/functions/v1/get-banners` endpoint is deployed
- [ ] Verify `/functions/v1/track-banner-impression` endpoint is deployed
- [ ] Verify `/functions/v1/track-banner-click` endpoint is deployed
- [ ] Test all endpoints with real data
- [ ] Verify ETag caching headers are returned
- [ ] Verify CORS headers are configured correctly (for web)

#### ✅ Database Setup
- [ ] Verify `banners` table exists with correct schema
- [ ] Verify `banner_impressions` table exists
- [ ] Verify `banner_clicks` table exists
- [ ] Verify RLS policies are set up correctly
- [ ] Verify indexes are created for performance
- [ ] Test database queries with production-like data

#### ✅ Configuration Verification
- [ ] Verify `BANNER_CONFIG` in `constants/config.ts` is correct
- [ ] Verify `SUPABASE_CONFIG` has correct URL and keys
- [ ] Verify `APP_VERSION` matches app store version
- [ ] Verify cache duration is appropriate (15 minutes)
- [ ] Verify auto-play interval is appropriate (5 seconds)

#### ✅ Testing with Real Banner Data
- [ ] Test banner display with real data from admin
- [ ] Test targeting with real user scenarios
- [ ] Test deep links with real routes
- [ ] Test analytics tracking with real events
- [ ] Verify impression/click data appears in analytics dashboard

#### ✅ Offline Functionality
- [ ] Test banner cache works offline
- [ ] Test tracking failures don't break app
- [ ] Test cache refresh when back online
- [ ] Verify no errors when offline

#### ✅ Deep Link Testing
- [ ] Test category links navigate correctly
- [ ] Test product links open detail page
- [ ] Test external URLs open in browser
- [ ] Test invalid links fail gracefully
- [ ] Test all deep link formats

#### ✅ Performance Testing
- [ ] Test on low-end devices
- [ ] Test with various banner counts
- [ ] Verify lazy loading works
- [ ] Check memory usage
- [ ] Verify no memory leaks
- [ ] Test image loading performance

#### ✅ Accessibility Testing
- [ ] Verify banner carousel is accessible
- [ ] Test with screen readers
- [ ] Verify proper ARIA labels
- [ ] Test keyboard navigation (web)
- [ ] Verify color contrast ratios

#### ✅ Cache Invalidation
- [ ] Test cache expires after TTL
- [ ] Test cache refreshes on app foreground
- [ ] Test cache clears on logout/login
- [ ] Verify ETag-based cache validation works

---

### 10.2 Monitoring Setup

#### Analytics Monitoring

**Set up monitoring for:**

1. **Banner API Error Rates**
   - Monitor `/functions/v1/get-banners` error rate
   - Alert if error rate > 5%
   - Track error types (4xx, 5xx, network errors)

2. **Image Loading Failures**
   - Monitor image load failures
   - Track broken image URLs
   - Alert if failure rate > 2%

3. **Deep Link Navigation Errors**
   - Monitor deep link parsing failures
   - Track navigation errors
   - Alert on invalid deep link patterns

4. **Analytics Tracking Failures**
   - Monitor impression tracking failures
   - Monitor click tracking failures
   - Alert if tracking failure rate > 10%

5. **Cache Hit/Miss Rates**
   - Monitor cache hit rate (target: >70%)
   - Track cache miss reasons
   - Monitor cache invalidation frequency

#### Key Metrics to Track

```typescript
// Example monitoring metrics
interface BannerMetrics {
  // Load metrics
  bannerLoadSuccessRate: number;      // Target: >95%
  bannerLoadTime: number;             // Target: <2s
  cacheHitRate: number;               // Target: >70%
  
  // Tracking metrics
  impressionTrackingRate: number;      // Target: >90%
  clickTrackingRate: number;          // Target: >95%
  
  // Error metrics
  apiErrorRate: number;               // Target: <5%
  imageLoadFailureRate: number;       // Target: <2%
  deepLinkErrorRate: number;          // Target: <1%
  
  // Performance metrics
  averageBannerCount: number;
  carouselScrollPerformance: number;   // Target: 60fps
}
```

#### Monitoring Queries

```sql
-- Banner load success rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM banner_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Impression tracking rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE tracked = true) * 100.0 / COUNT(*) as tracking_rate
FROM banner_impressions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Click tracking rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE tracked = true) * 100.0 / COUNT(*) as tracking_rate
FROM banner_clicks
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Cache hit rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE source = 'cache') * 100.0 / COUNT(*) as cache_hit_rate
FROM banner_loads
WHERE created_at > NOW() - INTERVAL '1 hour';

-- API error rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE status_code >= 400) * 100.0 / COUNT(*) as error_rate
FROM banner_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Image load failures (last hour)
SELECT 
  COUNT(*) FILTER (WHERE image_load_failed = true) * 100.0 / COUNT(*) as failure_rate
FROM banner_loads
WHERE created_at > NOW() - INTERVAL '1 hour';
```

#### Alert Thresholds

- **Critical Alerts** (immediate action required):
  - API error rate > 10%
  - Banner load success rate < 80%
  - Cache hit rate < 50%

- **Warning Alerts** (investigate soon):
  - API error rate > 5%
  - Banner load success rate < 90%
  - Impression tracking rate < 85%
  - Click tracking rate < 90%

- **Info Alerts** (monitor):
  - Cache hit rate < 70%
  - Image load failure rate > 2%
  - Deep link error rate > 1%

---

### 10.3 Post-Launch Monitoring

#### First 24 Hours
- [ ] Monitor error rates every hour
- [ ] Check analytics dashboard for tracking data
- [ ] Verify banner impressions are being tracked
- [ ] Verify banner clicks are being tracked
- [ ] Check for any user-reported issues
- [ ] Monitor performance metrics

#### First Week
- [ ] Review banner performance metrics
- [ ] Analyze banner click-through rates
- [ ] Review error logs for patterns
- [ ] Check cache hit rates
- [ ] Verify deep link navigation success rates
- [ ] Review user feedback

#### Ongoing Monitoring
- [ ] Weekly review of banner metrics
- [ ] Monthly performance analysis
- [ ] Quarterly optimization review
- [ ] Monitor for new error patterns
- [ ] Track banner effectiveness (CTR, conversions)

---

### 10.4 Rollback Plan

#### If Critical Issues Occur

1. **Disable Banner Feature**
   ```typescript
   // In constants/config.ts
   BANNER: {
     ENABLED: false,
     // ... other config
   }
   ```

2. **Clear Banner Cache**
   - Clear app cache on all devices
   - Or wait for cache TTL to expire

3. **Disable API Endpoints** (if needed)
   - Return empty array from `/get-banners`
   - Or disable endpoints in Supabase Edge Functions

4. **Monitor Impact**
   - Check error rates decrease
   - Verify app stability improves
   - Monitor user reports

---

### 10.5 Performance Benchmarks

#### Expected Performance Metrics

- **Banner Load Time**: < 2 seconds (first load)
- **Cache Load Time**: < 100ms (cached load)
- **Image Load Time**: < 1 second per image
- **Carousel Scroll**: 60fps (smooth)
- **Memory Usage**: < 50MB for banner system
- **API Response Time**: < 500ms (p95)

#### Performance Testing Results

Document actual performance metrics:

```
Banner Load Time: _____ ms
Cache Hit Rate: _____ %
Impression Tracking Rate: _____ %
Click Tracking Rate: _____ %
API Error Rate: _____ %
Image Load Failure Rate: _____ %
```

---

### 10.6 Documentation

#### Update Documentation
- [ ] Update README with banner feature
- [ ] Document banner configuration
- [ ] Document API endpoints
- [ ] Document deep link formats
- [ ] Create admin guide for banner management
- [ ] Document troubleshooting steps

#### Code Documentation
- [ ] Verify all functions have JSDoc comments
- [ ] Document configuration options
- [ ] Document error handling strategies
- [ ] Document testing utilities

---

### 10.7 Security Checklist

- [ ] Verify RLS policies prevent unauthorized access
- [ ] Verify API keys are not exposed in client
- [ ] Verify user data in tracking is sanitized
- [ ] Verify deep links are validated
- [ ] Verify no XSS vulnerabilities in banner content
- [ ] Verify image URLs are validated

---

### 10.8 Final Verification

Before marking deployment as complete:

- [ ] All pre-launch checklist items completed
- [ ] All tests passing
- [ ] Monitoring set up and working
- [ ] Documentation updated
- [ ] Team trained on banner management
- [ ] Rollback plan documented
- [ ] Performance benchmarks met
- [ ] Security review completed

---

## Deployment Sign-Off

**Deployed by**: _________________  
**Date**: _________________  
**Version**: _________________  
**Environment**: _________________  

**Approved by**: _________________  
**Date**: _________________  

---

## Post-Deployment Notes

Document any issues encountered, resolutions, and lessons learned:

```
Issue: 
Resolution: 
Date: 

Issue: 
Resolution: 
Date: 
```


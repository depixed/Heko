# HEKO Web Deployment Guide

## Overview
This guide covers deploying the HEKO web app to Netlify. The app now supports guest browsing and requires authentication only for protected actions.

## Changes Made

### 1. Authentication Flow
- **Guest browsing enabled**: Users can browse home, categories, and products without login
- **Auth gates added** to:
  - Cart checkout
  - Wallet screen
  - Orders screen
  - Profile screen
- **Demo wallet data removed**: Fixed hardcoded wallet balances showing for unauthenticated users
- **Splash screen updated**: All users now go to home screen (no forced login)

### 2. Web Optimizations
- **HTML head** (`app/+html.tsx`): SEO meta tags, social sharing, theme color
- **Responsive container** (`components/ResponsiveContainer.tsx`): Centers content on desktop (max 1024px)
- **Home screen**: Wrapped with responsive container for better desktop layout

### 3. PWA Configuration
- Existing PWA setup retained (favicon, icons)
- Update `app.json` router origin when domain is chosen

### 4. Build & Deploy Scripts
- `npm run build:web` - Build static web app to `dist/`
- `npm run preview:web` - Preview built app locally

## Deployment Steps

### Option 1: Netlify (Recommended)

#### A. Via Netlify Drop

1. **Build the app**:
   ```bash
   npm run build:web
   ```

2. **Deploy**:
   - Go to https://app.netlify.com/drop
   - Drag the `dist/` folder
   - Your site is live!

#### B. Via Git (Continuous Deployment)

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add web deployment support"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repo
   - Build settings:
     - Build command: `npm run build:web`
     - Publish directory: `dist`
   - Click "Deploy site"

3. **Configure domain** (optional):
   - Go to Site settings → Domain management
   - Add your custom domain
   - Update `app.json` with your domain:
     ```json
     "plugins": [["expo-router", { "origin": "https://yourdomain.com/" }]]
     ```

### Testing CORS

The Supabase config remains unchanged. Test if direct calls work:

1. After deployment, open the site
2. Try logging in
3. If OTP fails with CORS error, uncomment the proxy in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/api/supabase/*"
     to = "https://ijfgikkpiirepmjyvidl.supabase.co/:splat"
     status = 200
     force = true
   ```
4. Redeploy

**Note**: Supabase typically allows browser requests with the anon key, so the proxy is likely unnecessary.

## Post-Deployment Checklist

### Functionality Tests
- [ ] Home page loads with products
- [ ] Guest browsing: Browse categories and products without login
- [ ] Cart: Add products to cart as guest
- [ ] Checkout: Shows login prompt when guest tries to checkout
- [ ] Auth: Login/signup with OTP works
- [ ] Wallet: Redirects to login if not authenticated, shows balances when logged in
- [ ] Orders: Shows login prompt for guests, displays orders when authenticated
- [ ] Profile: Shows login prompt for guests, displays profile when authenticated
- [ ] Referral QR: Download works on web

### PWA Tests
- [ ] Chrome: Install app (three-dot menu → "Install app")
- [ ] iOS Safari: Add to Home Screen works
- [ ] Offline: Basic caching works (service worker active)

### Performance Tests
- [ ] Run Lighthouse audit (target ≥ 90 for PWA/SEO/Best Practices/Performance)
- [ ] Test on mobile viewport (responsive)
- [ ] Test on tablet viewport
- [ ] Test on desktop (content centered, max 1024px)

## Environment Variables (Optional)

If you want to move Supabase config to env vars (currently hardcoded):

1. Create `.env.local` (git-ignored):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://ijfgikkpiirepmjyvidl.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_SUPABASE_PROJECT_ID=ijfgikkpiirepmjyvidl
   ```

2. Update `constants/supabase.ts`:
   ```ts
   export const SUPABASE_CONFIG = {
     URL: process.env.EXPO_PUBLIC_SUPABASE_URL!,
     PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
     PROJECT_ID: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID!,
   } as const;
   ```

3. Add to Netlify:
   - Site settings → Build & deploy → Environment
   - Add the same variables

**Note**: The anon key is public by design; RLS policies protect the data.

## Troubleshooting

### Issue: "Network error" on login
- **Cause**: CORS blocking Supabase edge functions
- **Fix**: Uncomment proxy in `netlify.toml` and redeploy

### Issue: Wallet shows 0 balance after login
- **Cause**: Database not returning data (check RLS policies)
- **Fix**: Verify Supabase RLS allows authenticated reads to `profiles`, `wallet_transactions`

### Issue: PWA not installing
- **Cause**: Missing service worker or manifest
- **Fix**: Run `npm run build:web` again; check `dist/` has `_expo/static/js/` with service worker

### Issue: Routes return 404 on refresh
- **Cause**: Missing SPA fallback
- **Fix**: Verify `netlify.toml` is deployed with the site

## Mobile Builds

Mobile builds remain unchanged. This deployment only affects the web platform:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Next Steps

1. **Analytics**: Add Plausible or Google Analytics to `app/+html.tsx`
2. **Error tracking**: Add Sentry for production error monitoring
3. **Custom domain**: Purchase and configure in Netlify
4. **Update router origin**: Set your final domain in `app.json`
5. **Monitor**: Check Netlify Analytics for usage/performance

## Support

- Netlify docs: https://docs.netlify.com
- Expo docs: https://docs.expo.dev
- Supabase docs: https://supabase.com/docs


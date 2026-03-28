# Deploy Latest Fixes - Quick Guide

## What's Fixed in This Build

### ✅ 1. Decimal Pricing (30+ changes)
All prices and balances now show exactly 2 decimal places:
- Checkout page: ₹123.45 (was ₹123 or ₹124)
- Cart page: ₹25.50 (was ₹25 or ₹26)
- Product pages: ₹45.75 (was ₹45 or ₹46)
- Wallet balances: Already correct, maintained
- Order totals: ₹284.30 (was ₹284 or ₹285)

### ✅ 2. Web Checkout Redirect
After placing order on web:
- **Before**: Redirected to cart page (wrong)
- **After**: Redirected to orders page (correct) ✅

## Deployment Steps

### Option 1: Quick Deploy (Netlify Drag & Drop)

```bash
# The build is already complete!
# Just deploy the dist folder
```

1. Go to https://app.netlify.com/drop
2. Drag the `dist/` folder from your project
3. Wait for deployment to complete
4. Test your site!

### Option 2: Git Deploy (Recommended)

```bash
# 1. Commit the changes
git add .
git commit -m "Fix: Add decimal pricing and web checkout redirect"

# 2. Push to your repository
git push origin main

# 3. Netlify will auto-deploy (if connected)
```

### Option 3: Netlify CLI

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Deploy the dist folder
netlify deploy --prod --dir=dist
```

## Quick Testing After Deploy

### Test 1: Decimal Pricing ✅
1. Open your web app
2. Browse products
3. **Check**: Prices show `.00` or actual decimals (e.g., ₹25.50)
4. Add items to cart
5. **Check**: Cart totals show decimals
6. Go to checkout
7. **Check**: Wallet balance shows decimals (e.g., ₹123.45)

### Test 2: Checkout Redirect ✅
1. Add items to cart
2. Go to checkout
3. Complete checkout and place order
4. **Check**: Redirects to Orders page (not cart)
5. **Check**: New order appears in orders list

## Build Output Summary

```
✅ Build completed successfully
✅ Output: dist/ folder
✅ Size: ~3.52 MB (JavaScript bundle)
✅ Assets: 17 images + fonts
✅ Entry point: entry-*.js

Files in dist/:
├── _expo/
│   └── static/
│       └── js/
│           └── web/
│               └── entry-[hash].js (3.52 MB)
├── index.html
├── favicon.ico
└── metadata.json
```

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Revert the changes
git revert HEAD

# Rebuild
npm run build:web

# Redeploy
netlify deploy --prod --dir=dist
```

## Verify Deployment

### Check 1: Build Hash Changed
Old build will have different hash in URL:
```
Before: entry-[old-hash].js
After:  entry-e954d9dce7b08b990b23b3239687f376.js
```

### Check 2: Console Logs
Open browser console and check:
```javascript
// Should log when auth happens
[AuthContext] Logging in user: <uuid>
[AuthContext] Wallet loaded: <virtual> <actual>
```

### Check 3: Visual Check
- Open checkout page
- Look at wallet balance
- Should see: ₹123.45 (not ₹123 or ₹124)

## Common Issues

### Issue: "Still seeing old version"
**Solution**: 
- Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Open in incognito/private window

### Issue: "Decimal prices not showing"
**Solution**:
- Check that new build was deployed (verify hash in network tab)
- Check that you're on the correct URL
- Try clearing Netlify cache and redeploying

### Issue: "Checkout still redirects to cart"
**Solution**:
- Verify Platform.OS check is working
- Check browser console for errors
- Ensure cart is being cleared properly

## Files Changed in This Deploy

1. **app/checkout.tsx** - Decimal prices + redirect fix
2. **app/cart.tsx** - Decimal prices
3. **app/product/[id].tsx** - Decimal prices
4. **app/(tabs)/index.tsx** - Decimal prices
5. **app/subcategory/[categoryId]/[subcategory].tsx** - Decimal prices

## Success Criteria

After deployment, verify:
- ✅ All prices show 2 decimal places
- ✅ Wallet balances show 2 decimal places
- ✅ Checkout redirects to orders (web)
- ✅ Mobile checkout still shows alert (unchanged)
- ✅ No console errors
- ✅ Orders display correctly

## Next Steps After Deploy

1. **Monitor**: Watch for user feedback
2. **Test**: Try placing real orders
3. **Verify**: Check Supabase logs for errors
4. **Document**: Update CHANGES_SUMMARY.txt if needed

---

## Quick Commands Reference

```bash
# Build for web
npm run build:web

# Preview locally before deploy
npm run preview:web

# Deploy to Netlify (CLI)
netlify deploy --prod --dir=dist

# Check deployment status
netlify status

# View site
netlify open:site
```

---

**Build Status**: ✅ Complete  
**Ready to Deploy**: ✅ Yes  
**Tested Locally**: Recommended before production deploy  
**Impact**: High - Fixes critical UX issues  
**Risk**: Low - Display and navigation changes only


# HEKO Web - Quick Start

## 🚀 Deploy in 3 Steps

### 1. Build
```bash
npm run build:web
```

### 2. Test Locally (Optional)
```bash
npm run preview:web
```
Visit: http://localhost:3000

### 3. Deploy to Netlify

**Option A: Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag the `dist/` folder
3. Done! 🎉

**Option B: Git**
1. Push to GitHub
2. Connect repo in Netlify
3. Build command: `npm run build:web`
4. Publish directory: `dist`
5. Deploy!

## ✅ What Changed

### Guest Browsing
- Users can browse without login
- Cart works for guests
- Login required only for: checkout, wallet, orders, profile

### Web Optimizations
- SEO meta tags
- Responsive desktop layout (centered, max 1024px)
- PWA support (installable)

### No Database Changes
- Supabase config unchanged
- All mobile builds unchanged
- Zero backend modifications

## 🧪 Quick Test

After deployment:

1. **Guest flow**:
   - Open site → Browse products ✓
   - Add to cart ✓
   - Try checkout → Login prompt ✓

2. **Auth flow**:
   - Login with OTP ✓
   - View wallet, orders, profile ✓
   - Complete checkout ✓

3. **PWA**:
   - Chrome: Menu → "Install app" ✓
   - iOS Safari: Share → "Add to Home Screen" ✓

## 📁 Key Files

- `app/+html.tsx` - SEO meta tags
- `components/ResponsiveContainer.tsx` - Desktop layout
- `netlify.toml` - Deploy config
- `WEB_DEPLOYMENT_GUIDE.md` - Full guide
- `WEB_IMPLEMENTATION_SUMMARY.md` - All changes

## 🐛 Troubleshooting

**Login fails with network error?**
→ Uncomment proxy in `netlify.toml`, redeploy

**Routes 404 on refresh?**
→ Check `netlify.toml` deployed with site

**Wallet shows ₹0 after login?**
→ Check Supabase RLS policies allow reads

## 📚 Documentation

- Full deployment guide: `WEB_DEPLOYMENT_GUIDE.md`
- Implementation details: `WEB_IMPLEMENTATION_SUMMARY.md`
- Netlify docs: https://docs.netlify.com

---

**Need help?** Check the guides above or open an issue.


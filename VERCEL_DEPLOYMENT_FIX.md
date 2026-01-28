# Vercel Deployment Fix

## ✅ Issue Fixed
The 404 error on Vercel was caused by incorrect routing. The fix includes:

1. **Updated vercel.json** - Added explicit routes for serverless functions
2. **API client** - Already uses correct paths (`/api/orderrows`, `/api/orders`)

## 📝 Deployment Steps

### 1. Set Environment Variables in Vercel
Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add:
- `FLORINET_USERNAME` = `JeroenMainfact`
- `FLORINET_PASSWORD` = `&WWpxaM@#`

**Important:** Add for ALL environments (Production, Preview, Development)

### 2. Deploy to Vercel

**Option A: Via Git (Recommended)**
```bash
git add .
git commit -m "Fix Vercel deployment routing"
git push origin main
```
Vercel will auto-deploy.

**Option B: Via Vercel CLI**
```bash
vercel --prod
```

### 3. Verify Deployment

After deployment:
1. Open your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Open browser console (F12)
3. Should see: "🌐 Vercel Production - using serverless functions"
4. Should see: "📤 Fetching orderrows from: https://your-app.vercel.app/api/orderrows..."
5. No more 404 errors!

## 🔍 Troubleshooting

### Still getting 404?
1. Check Vercel Dashboard → Functions tab
2. Verify functions are deployed: `/api/authenticate`, `/api/orderrows`, `/api/orders`
3. Check function logs for errors
4. Verify environment variables are set

### Authentication errors?
- Check environment variables are set correctly
- Verify variable names match exactly: `FLORINET_USERNAME`, `FLORINET_PASSWORD`
- Redeploy after adding/changing variables


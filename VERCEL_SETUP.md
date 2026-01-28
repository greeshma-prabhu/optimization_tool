# Vercel Deployment Setup Guide

## ✅ Authentication Fix for All Users

This guide explains how to deploy the application to Vercel with serverless API proxy functions that work for ALL users, not just the developer.

## 🏗️ Architecture

**Before (Broken for other users):**
```
User Browser → Florinet API directly
❌ CORS issues, IP restrictions, authentication failures
```

**After (Works for everyone):**
```
User Browser → Vercel Serverless Function → Florinet API
✅ No CORS, credentials secure, works for all users
```

## 📁 Project Structure

```
your-project/
├── api/                    # Vercel serverless functions
│   ├── authenticate.js     # Authentication endpoint
│   ├── orders.js           # Full orders endpoint
│   └── orderrows.js        # Order rows endpoint
├── js/
│   └── api.js              # Frontend API client (updated)
├── vercel.json             # Vercel configuration
├── package.json            # Dependencies
└── [other files...]
```

## 🔧 Step 1: Configure Vercel Environment Variables

**CRITICAL:** You MUST set these environment variables in Vercel for authentication to work!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `FLORINET_USERNAME` | `JeroenMainfact` | Production, Preview, Development |
| `FLORINET_PASSWORD` | `&WWpxaM@#` | Production, Preview, Development |

**Important:**
- Add them for ALL environments (Production, Preview, Development)
- These are stored securely and encrypted by Vercel
- Never commit these to Git!

## 🚀 Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will auto-deploy on every push

## ✅ Step 3: Verify Deployment

After deployment:

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Open browser console (F12)
3. Check for these logs:
   - `🚀 FlorinetAPI INITIALIZED (Vercel Proxy)`
   - `🔐 AUTHENTICATING (Vercel Proxy)...`
   - `✅ AUTHENTICATION SUCCESS`

4. Test with another user:
   - Share the Vercel link with your manager
   - They should be able to access without authentication errors
   - Orders should load automatically

## 🔍 Troubleshooting

### Issue: "Authentication failed" error

**Solution:**
1. Check Vercel environment variables are set correctly
2. Verify variable names match exactly: `FLORINET_USERNAME` and `FLORINET_PASSWORD`
3. Redeploy after adding/changing environment variables

### Issue: "No authorization token provided"

**Solution:**
- This means the frontend isn't calling `/api/authenticate` first
- Check browser console for errors
- Verify `js/api.js` is using `/api` baseURL (not localhost)

### Issue: CORS errors

**Solution:**
- Serverless functions handle CORS automatically
- If you see CORS errors, check that requests are going to `/api/*` endpoints
- Verify `vercel.json` routing is correct

### Issue: Functions not found (404)

**Solution:**
1. Check that `api/` folder exists in project root
2. Verify `vercel.json` has correct routing
3. Redeploy after adding new functions

## 📝 How It Works

### Authentication Flow

1. **User opens app** → Frontend loads
2. **Frontend calls** `/api/authenticate` → Vercel serverless function
3. **Serverless function** → Authenticates with Florinet API using env vars
4. **Returns token** → Frontend stores token in localStorage
5. **Frontend uses token** → For all subsequent API calls

### API Request Flow

1. **Frontend needs orders** → Calls `/api/orderrows?deliveryStartDate=...`
2. **Serverless function** → Receives request with Bearer token
3. **Serverless function** → Forwards request to Florinet API with token
4. **Florinet API** → Returns data
5. **Serverless function** → Returns data to frontend (no CORS issues!)

## 🔒 Security Benefits

✅ **Credentials never exposed** - Stored in Vercel environment variables (encrypted)
✅ **No CORS issues** - Server-to-server communication
✅ **Works for all users** - No IP restrictions or browser differences
✅ **Token caching** - Server-side caching reduces API calls
✅ **Production-ready** - Scalable and secure

## 📊 Monitoring

Check Vercel Dashboard → Your Project → Functions tab to see:
- Function invocations
- Execution time
- Error logs
- Success rates

## 🎯 Next Steps

1. ✅ Set environment variables in Vercel
2. ✅ Deploy to Vercel
3. ✅ Test with multiple users
4. ✅ Monitor function logs for any issues

## 💡 Local Development

For local development, you can still use the proxy server:

```bash
# Start local proxy server
npm start

# The frontend will automatically use localhost:3001 in development
# Or you can use Vercel dev mode:
vercel dev
```

---

**Questions?** Check Vercel logs or browser console for detailed error messages.


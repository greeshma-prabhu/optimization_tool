# Quick Start Guide

## 🚀 Running the Project

### Option 1: Local Development (Recommended for Testing)

```bash
# Run the proxy server
./run.sh

# OR simply:
npm start
```

Then open: **http://localhost:3001**

The proxy server handles API authentication and CORS.

### Option 2: Vercel Development

```bash
# Run with Vercel dev server (uses serverless functions)
./run-vercel.sh

# OR:
vercel dev
```

Then open: **http://localhost:3000**

⚠️ **Important:** Make sure you've set environment variables in Vercel:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add `FLORINET_USERNAME` and `FLORINET_PASSWORD`

### Option 3: Static Files Only

Just open `index.html` in your browser (API calls won't work, but UI will load).

## 🔧 Sync Now Button Fix

The "Sync Now" button on the Orders page is now fixed:
- ✅ Globally accessible (`window.syncOrders`)
- ✅ Proper error handling
- ✅ Loading states (button shows "⏳ Syncing..." during sync)
- ✅ Checks if `orderManager` is initialized

## 📝 Troubleshooting

### Sync Now button not working?

1. **Check browser console (F12)** for error messages
2. **Verify orderManager is loaded:**
   ```javascript
   // In browser console:
   console.log(typeof orderManager); // Should be "object"
   ```
3. **Check API connection:**
   ```javascript
   // In browser console:
   console.log(florinetAPI.baseURL); // Should show the API URL
   ```

### Authentication errors?

- **Local:** Make sure proxy server is running (`npm start`)
- **Vercel:** Check environment variables are set correctly

### Port 3001 already in use?

```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9

# OR use a different port (edit proxy-server.js)
```

## 🎯 Quick Commands

```bash
# Start local development
npm start

# Start Vercel development
vercel dev

# Install dependencies (if needed)
npm install

# Check Node.js version
node -v  # Should be 14+
```

## 📚 More Information

- **Vercel Setup:** See `VERCEL_SETUP.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Technical Docs:** See `TECHNICAL_DOCUMENTATION.md`




# Deployment Guide - Zuidplas Cart Loading Optimizer

## 🚀 Quick Deployment to Vercel

### Step 1: Prepare Files
All unnecessary files have been cleaned up. The project is ready for deployment.

### Step 2: Deploy to Vercel

**Option A: Vercel CLI (Recommended)**
```bash
npm i -g vercel
cd /opt/Zuidplas_logistic_tool
vercel
```

**Option B: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository OR drag & drop the folder
4. Framework Preset: **Other**
5. Build Command: (leave empty)
6. Output Directory: (leave empty)
7. Click "Deploy"

**Option C: GitHub Integration**
1. Push code to GitHub
2. Connect GitHub to Vercel
3. Select repository
4. Deploy automatically

### Step 3: Configure Environment (if needed)

For proxy server (if deploying separately):
- Set environment variables if needed
- Proxy server runs on port 3001

### Step 4: Update API URLs

After deployment, update `js/api.js`:
- Change `baseURL` from `http://localhost:3001/api` to your proxy server URL
- Or deploy proxy server separately and update URL

## 📁 Project Structure (Clean)

```
zuidplas-logistic-tool/
├── index.html              # Main dashboard
├── orders.html             # Daily orders
├── optimization.html       # Route optimization
├── cart-loading.html       # 🆕 Cart loading optimizer (MAIN FEATURE)
├── trucks.html             # Truck allocation
├── costs.html              # Cost analysis
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── auth.js            # Authentication
│   ├── api.js             # API client
│   ├── orders.js          # Order processing
│   ├── carts.js           # Cart logic
│   ├── optimizer.js       # Optimization
│   ├── data.js            # Business data
│   └── navigation.js      # Navigation
├── proxy-server.js        # Node.js proxy (for CORS)
├── package.json           # Node.js dependencies
├── README.md              # Documentation
└── DEPLOYMENT.md          # This file
```

## 🔗 After Deployment

1. **Get your Vercel URL**: `https://your-project.vercel.app`
2. **Share with Jeroen** (see MESSAGE_TEMPLATE.md)
3. **Test all features**:
   - Dashboard → Load Demo Data
   - Cart Loading → Optimize Cart Loading
   - Orders → View orders
   - Optimization → Run optimization

## ⚠️ Important Notes

### Proxy Server
- The proxy server (`proxy-server.js`) is needed for API calls
- Deploy it separately or run locally
- Update `js/api.js` with proxy URL after deployment

### Static Files
- All HTML/CSS/JS files are static
- No build process needed
- Works directly on Vercel

### API Credentials
- Currently in `js/auth.js`
- For production, consider backend API
- Proxy server handles CORS

## 🧪 Testing Checklist

- [ ] Dashboard loads
- [ ] "Load Demo Data" button works
- [ ] Cart Loading page shows trucks
- [ ] Optimization runs without errors
- [ ] Orders page displays data
- [ ] Navigation works between pages
- [ ] Mobile responsive


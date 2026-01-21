# How to Start Proxy Server

## 🚀 Quick Start

### Option 1: Run in Terminal
```bash
cd /opt/Zuidplas_logistic_tool
node proxy-server.js
```

### Option 2: Run in Background
```bash
cd /opt/Zuidplas_logistic_tool
node proxy-server.js > /tmp/proxy-server.log 2>&1 &
```

### Option 3: Check if Already Running
```bash
# Check if port 3001 is in use
lsof -i :3001

# If running, you'll see the process
# If not, start it with Option 1 or 2
```

---

## ✅ Verify It's Working

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"OK"}`

### Test 2: Authentication
```bash
curl -X POST http://localhost:3001/api/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"JeroenMainfact","password":"&WWpxaM@#"}'
```
Should return: `{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}`

---

## 📋 What the Proxy Does

1. **Bypasses CORS** - Allows frontend to call Florinet API
2. **Forwards Requests** - Sends requests to `https://summit.florinet.nl/api/v1`
3. **Handles Authentication** - Manages JWT tokens
4. **Logs Everything** - Check console for debugging

---

## 🔧 If Proxy Won't Start

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill it
kill <PID>

# Then start proxy again
node proxy-server.js
```

### Missing Dependencies
```bash
# Install dependencies
npm install
```

### Check Logs
```bash
# If running in background, check logs
tail -f /tmp/proxy-server.log
```

---

## 🎯 Once Proxy is Running

1. ✅ Open browser to `http://localhost:8080`
2. ✅ System will auto-authenticate
3. ✅ Click "Sync Orders from API"
4. ✅ Real data will load!

---

**The proxy server is essential for API connection!** Make sure it's running before testing with real data.


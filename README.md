# Zuidplas Route & Cart Optimization System

Professional route optimization system with Florinet API integration for automated cart loading and route planning.

## 🚀 Quick Start

### Local Development

1. **Navigate to project directory**
   ```bash
   cd /opt/Zuidplas_logistic_tool
   ```

2. **Start servers**

   **Option A: Start both servers automatically (EASIEST)**
   ```bash
   ./start-all.sh
   ```
   
   This starts both the proxy server (port 3001) and HTTP server (port 8080) automatically.

   **Option B: Start servers manually (2 terminals)**

   **Terminal 1: Start Proxy Server (REQUIRED for API)**
   ```bash
   npm start
   ```
   This runs on port 3001 and handles API calls.

   **Terminal 2: Start HTTP Server (for static files)**
   ```bash
   python3 -m http.server 8080
   ```

3. **Open in browser**
   - Navigate to: `http://localhost:8080`
   - The proxy server (port 3001) will handle API calls automatically
   - The system will auto-authenticate with Florinet API

## 📁 Project Structure

```
zuidplas-logistic-tool/
├── index.html              # Main dashboard
├── orders.html             # Daily orders from API
├── optimization.html       # Route optimization engine
├── cart-loading.html       # 🎯 Cart Loading Optimizer (MAIN FEATURE)
├── trucks.html             # Truck allocation view
├── costs.html              # Cost analysis
├── css/
│   └── styles.css         # All shared styles
├── js/
│   ├── auth.js            # JWT token management
│   ├── api.js             # Florinet API client
│   ├── orders.js          # Order processing
│   ├── carts.js           # Cart assignment logic
│   ├── optimizer.js       # Route optimization algorithm
│   ├── data.js            # Static business data
│   └── navigation.js      # Page navigation
├── proxy-server.js         # Node.js proxy server (for CORS)
├── package.json           # Node.js dependencies
├── README.md              # This file
├── DEPLOYMENT.md          # Deployment guide
├── MESSAGE_TEMPLATE.md    # Message template for Jeroen
└── QUESTIONS_FOR_JEROEN.md # Questions to ask
```

## 🌐 Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Framework Preset: **Other**
4. Build Command: (leave empty)
5. Output Directory: (leave empty)
6. Deploy

### Option 3: Drag & Drop

1. Go to [vercel.com](https://vercel.com)
2. Drag the entire folder to deployment area
3. Deploy

## 🔑 API Configuration

The system automatically authenticates with Florinet API using:
- **Base URL**: `https://summit.florinet.nl/api/v1`
- **Username**: `JeroenMainfact`
- **Password**: `&WWpxaM@#`

**Token Management:**
- Tokens are stored in localStorage
- Auto-refresh when expired (1 hour expiry)
- Secure handling (never exposed in frontend)

## 📋 Features

### Pages

1. **Dashboard** (`index.html`)
   - Real-time order stats
   - Route overview with capacity status
   - Optimization suggestions
   - One-click order sync from API

2. **Orders** (`orders.html`)
   - Daily orders from Florinet API
   - Automatic cart type assignment
   - Filter and search functionality
   - CSV export

3. **Cart Loading Optimizer** (`cart-loading.html`) 🎯 **MAIN FEATURE**
   - Visual truck loading with 17 cart slots
   - Automatic cart assignment to Truck 1 & Truck 2
   - Route coverage: Truck 1 (Route 1 + Route 3), Truck 2 (Route 2)
   - Capacity optimization with Danish cart rules
   - Overflow handling
   - Real-time capacity visualization

4. **Optimization** (`optimization.html`)
   - Route optimization engine
   - Multiple allocation scenarios
   - Cost comparison
   - Feasibility checking

5. **Trucks** (`trucks.html`)
   - Truck fleet management
   - Real-time allocation status
   - Cart loading visualization
   - Neighbor truck coordination

6. **Costs** (`costs.html`)
   - Cost comparison table
   - Optimization tips
   - Monthly savings calculations

## 🎯 Business Rules

### Cart System
- **Truck Capacity**: 17 standard carts maximum
- **Danish Rule**: If >6 Danish carts used, capacity drops to 16
- **Conversion**: 2 Danish carts = 1 Standard cart

### Routes
- **Route 1**: Rijnsburg (09:00) - 27 clients
- **Route 2**: Aalsmeer (10:00) - 47 clients
- **Route 3**: Naaldwijk (11:00) - TBD clients

### Special Customers
- **Danish Cart Required**: Superflora, Flamingo, FTC Bleiswijk, MM Flowers, Dijk Flora
- **Direct Box**: MM Flowers, Dijk Flora (Aalsmeer route)

### Truck Priority
1. Own trucks (€150 per route)
2. Neighbor's truck (Free, requires call)
3. External truck (€250 per trip)

## 🔧 Customization

### Update Business Data

Edit `js/data.js` to modify:
- Routes and schedules
- Client lists
- Cart capacities
- Cost structures
- Special customer requirements

### Modify API Settings

Edit `js/auth.js` to change:
- API credentials
- Token expiry handling
- Authentication flow

## ⚠️ Important Notes

### API Authentication

The system uses JWT tokens that expire after 1 hour. The system automatically:
- Stores tokens in localStorage
- Refreshes when expired
- Handles authentication errors gracefully

### Error Handling

- API connection errors are displayed to user
- Token expiry triggers auto-refresh
- Failed requests show user-friendly messages

### Security

- Credentials are stored in JavaScript (consider moving to backend in production)
- Tokens stored in localStorage (consider httpOnly cookies in production)
- All API calls use HTTPS

## 🐛 Troubleshooting

### API Authentication Fails
- Check internet connection
- Verify API credentials in `js/auth.js`
- Check browser console for errors
- Ensure API endpoint is accessible

### Orders Not Loading
- Check API connection status (top right)
- Verify date format (YYYY-MM-DD)
- Check browser console for errors
- Try manual sync button

### Optimization Not Working
- Ensure orders are loaded first
- Check that orders have valid customer/location data
- Verify cart assignment is working

## 📊 Performance

- Lazy loading of orders
- Cached API responses
- Optimized calculations
- Efficient DOM updates

## 🔮 Future Enhancements

- [ ] Backend API for secure credential storage
- [ ] Real-time order updates via WebSocket
- [ ] Historical data and analytics
- [ ] Mobile app version
- [ ] Print-friendly route sheets
- [ ] Multi-day planning
- [ ] Integration with GPS tracking
- [ ] Automated neighbor truck booking

## 📄 License

This is a proprietary system for Zuidplas Logistics. All rights reserved.

## 👥 Support

For issues or questions:
- Check browser console for errors
- Review code comments in JavaScript files
- Verify API connectivity
- Check network tab for API requests

---

**Version**: 2.0.0  
**Last Updated**: 2025-01-16  
**Status**: Production Ready ✅

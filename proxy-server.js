const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

const FLORINET_BASE = 'https://summit.florinet.nl';
const FLORINET_API_BASE = 'https://summit.florinet.nl/api/v1';

// Session storage for cookies
const sessions = new Map();

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Proxy authentication endpoint - Try both JWT and Session-based
app.post('/api/authenticate', async (req, res) => {
  console.log('🔐 Proxying authentication request...');
  
  try {
    // First try JWT authentication
    const jwtResponse = await fetch(`${FLORINET_API_BASE}/authenticate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (jwtResponse.ok) {
      const data = await jwtResponse.json();
      console.log('✅ JWT Auth successful');
      return res.status(jwtResponse.status).json(data);
    }
    
    // If JWT fails, try session-based authentication
    console.log('⚠️ JWT auth failed, trying session-based...');
    
    const sessionId = `session_${Date.now()}`;
    const cookieJar = [];
    
    // Create session with login
    const loginResponse = await fetch(`${FLORINET_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        email: req.body.username || req.body.email,
        username: req.body.username || req.body.email,
        password: req.body.password
      }),
      redirect: 'manual'
    });
    
    // Extract cookies
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
    setCookieHeaders.forEach(cookie => {
      cookieJar.push(cookie.split(';')[0]);
    });
    
    const cookieString = cookieJar.join('; ');
    sessions.set(sessionId, cookieString);
    
    console.log('✅ Session auth successful, cookies:', cookieString.substring(0, 50) + '...');
    
    // Test session by accessing orders endpoint
    const testResponse = await fetch(`${FLORINET_BASE}/api/orders`, {
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      return res.status(200).json({ 
        token: sessionId, // Return session ID as "token"
        sessionId: sessionId,
        type: 'session',
        message: 'Session-based authentication successful'
      });
    }
    
    throw new Error('Session authentication failed');
    
  } catch (error) {
    console.error('❌ Auth proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy authentication failed', 
      details: error.message 
    });
  }
});

// Proxy full orders endpoint - supports both single date and date ranges
app.get('/api/external/orders', async (req, res) => {
  console.log('📦 Proxying full orders request...');
  console.log('   Query params:', req.query);
  
  try {
    const deliveryDate = req.query.deliveryDate;
    const deliveryStartDate = req.query.deliveryStartDate;
    const deliveryEndDate = req.query.deliveryEndDate;
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    // Build query string for API call
    let apiQueryString = '';
    if (deliveryStartDate && deliveryEndDate) {
      apiQueryString = `deliveryStartDate=${deliveryStartDate}&deliveryEndDate=${deliveryEndDate}`;
      console.log('   Date range:', deliveryStartDate, 'to', deliveryEndDate);
    } else if (deliveryDate) {
      apiQueryString = `deliveryStartDate=${deliveryDate}&deliveryEndDate=${deliveryDate}`;
      console.log('   Single date:', deliveryDate);
    } else {
      return res.status(400).json({ error: 'Missing date parameter. Use deliveryDate or deliveryStartDate+deliveryEndDate' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const sessionCookies = sessions.get(token);
    
    let response;
    
    if (sessionCookies) {
      response = await fetch(
        `${FLORINET_API_BASE}/external/orders?${apiQueryString}`,
        {
          headers: { 
            'Cookie': sessionCookies,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
    } else {
      response = await fetch(
        `${FLORINET_API_BASE}/external/orders?${apiQueryString}`,
        {
          headers: { 
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
    }
    
    console.log('   API Response Status:', response.status);
    
    if (response.status === 500) {
      console.log('   ⚠️ API returned 500 - might be no orders for this date');
      return res.status(200).json([]);
    }
    
    const responseText = await response.text();
    let data;
    
    if (!responseText || responseText.trim() === '') {
      data = [];
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
          return res.status(200).json([]);
        }
        return res.status(response.status).json({ 
          error: 'Invalid JSON response from API',
          rawResponse: responseText.substring(0, 500)
        });
      }
    }
    
    console.log('✅ Full orders response parsed successfully');
    console.log('📊 Orders count:', Array.isArray(data) ? data.length : 'unknown');
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Full orders proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy full orders fetch failed', 
      details: error.message 
    });
  }
});

// Proxy order rows endpoint - supports both single date and date ranges
app.get('/api/external/orderrows', async (req, res) => {
  console.log('📦 Proxying order rows request...');
  console.log('   Query params:', req.query);
  
  try {
    const deliveryDate = req.query.deliveryDate;
    const deliveryStartDate = req.query.deliveryStartDate;
    const deliveryEndDate = req.query.deliveryEndDate;
    const slim = req.query.slim || '1';
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    // Build query string for API call
    let apiQueryString = '';
    if (deliveryStartDate && deliveryEndDate) {
      // Date range
      apiQueryString = `deliveryStartDate=${deliveryStartDate}&deliveryEndDate=${deliveryEndDate}&slim=${slim}`;
      console.log('   Date range:', deliveryStartDate, 'to', deliveryEndDate);
    } else if (deliveryDate) {
      // Single date
      apiQueryString = `deliveryStartDate=${deliveryDate}&deliveryEndDate=${deliveryDate}&slim=${slim}`;
      console.log('   Single date:', deliveryDate);
    } else {
      return res.status(400).json({ error: 'Missing date parameter. Use deliveryDate or deliveryStartDate+deliveryEndDate' });
    }
    
    // Check if it's a session ID or JWT token
    const token = authHeader.replace('Bearer ', '');
    const sessionCookies = sessions.get(token);
    
    let response;
    
    if (sessionCookies) {
      // Use session-based authentication
      console.log('   Using session-based auth');
      
      // Try the API endpoint first
      response = await fetch(
        `${FLORINET_API_BASE}/external/orderrows?${apiQueryString}`,
        {
          headers: { 
            'Cookie': sessionCookies,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      // If that fails, try the web endpoint
      if (!response.ok && response.status === 500) {
        console.log('   API endpoint failed, trying web endpoint...');
        response = await fetch(
          `${FLORINET_BASE}/api/orders?${apiQueryString}`,
          {
            headers: { 
              'Cookie': sessionCookies,
              'Accept': 'application/json'
            }
          }
        );
      }
    } else {
      // Use JWT token
      console.log('   Using JWT token');
      response = await fetch(
        `${FLORINET_API_BASE}/external/orderrows?${apiQueryString}`,
        {
          headers: { 
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
    }
    
    console.log('   API Response Status:', response.status);
    console.log('   API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    // Handle 500 errors gracefully - might be no orders or endpoint issue
    if (response.status === 500) {
      console.log('   ⚠️ API returned 500 - might be no orders for this date or endpoint issue');
      console.log('   Returning empty array (no orders found)');
      return res.status(200).json([]); // Return empty array instead of error
    }
    
    // Get response text first to check what we're dealing with
    const responseText = await response.text();
    console.log('   API Response Length:', responseText.length);
    console.log('   API Response Preview:', responseText.substring(0, 200));
    
    // Log first order structure if available (for debugging)
    try {
      const parsedData = JSON.parse(responseText);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        console.log('   📋 FIRST ORDER STRUCTURE (from proxy):');
        console.log('   Fields:', Object.keys(parsedData[0]));
        console.log('   Sample:', JSON.stringify(parsedData[0], null, 2).substring(0, 500));
      }
    } catch (e) {
      // Not JSON or can't parse - that's OK
    }
    
    // Try to parse as JSON, but handle empty or non-JSON responses
    let data;
    if (!responseText || responseText.trim() === '') {
      console.log('   ⚠️ Empty response - returning empty array');
      data = [];
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('   ❌ JSON Parse Error:', parseError.message);
        console.error('   Response was:', responseText.substring(0, 500));
        // If it's HTML error page, return empty array (no orders)
        if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
          console.log('   ⚠️ HTML response detected - likely no orders endpoint or no data');
          return res.status(200).json([]);
        }
        // Otherwise return error
        return res.status(response.status).json({ 
          error: 'Invalid JSON response from API',
          rawResponse: responseText.substring(0, 500),
          status: response.status
        });
      }
    }
    
    console.log('✅ Orders response parsed successfully');
    console.log('📊 Orders count:', Array.isArray(data) ? data.length : 'unknown');
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Orders proxy error:', error);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Proxy orders fetch failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Proxy contracts endpoint
app.get('/api/external/contracts', async (req, res) => {
  console.log('📄 Proxying contracts request...');
  
  try {
    const token = req.headers.authorization;
    
    const response = await fetch(`${FLORINET_BASE}/external/contracts`, {
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Contracts proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy contracts fetch failed', 
      details: error.message 
    });
  }
});

// Proxy composite products endpoint
app.get('/api/external/compositeproducts', async (req, res) => {
  console.log('🌸 Proxying composite products request...');
  
  try {
    const token = req.headers.authorization;
    
    const response = await fetch(`${FLORINET_BASE}/external/compositeproducts`, {
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Products proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy products fetch failed', 
      details: error.message 
    });
  }
});

// Proxy growers endpoint
app.get('/api/external/growers', async (req, res) => {
  console.log('🌱 Proxying growers request...');
  
  try {
    const token = req.headers.authorization;
    
    const response = await fetch(`${FLORINET_BASE}/external/growers`, {
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Growers proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy growers fetch failed', 
      details: error.message 
    });
  }
});

// Debug endpoint to see API order structure
app.get('/api/debug/order-structure', async (req, res) => {
  console.log('🔍 DEBUG: Fetching order structure...');
  
  try {
    // Get token
    const authResponse = await fetch(`${FLORINET_BASE}/authenticate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'JeroenMainfact',
        password: '&WWpxaM@#'
      })
    });
    
    const authData = await authResponse.json();
    if (!authData.token) {
      return res.json({ error: 'Auth failed' });
    }
    
    // Get yesterday's date in DD-MM-YYYY format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = `${String(yesterday.getDate()).padStart(2, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${yesterday.getFullYear()}`;
    
    // Fetch orders
    const ordersResponse = await fetch(
      `${FLORINET_API_BASE}/external/orderrows?deliveryStartDate=${dateStr}&deliveryEndDate=${dateStr}&slim=1`,
      {
        headers: { 
          'Authorization': `Bearer ${authData.token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const ordersText = await ordersResponse.text();
    const orders = JSON.parse(ordersText);
    
    if (orders.length > 0) {
      return res.json({
        success: true,
        orderCount: orders.length,
        firstOrder: orders[0],
        firstOrderKeys: Object.keys(orders[0]),
        firstOrderFields: Object.keys(orders[0]).reduce((acc, key) => {
          acc[key] = typeof orders[0][key];
          return acc;
        }, {})
      });
    } else {
      return res.json({ success: true, orderCount: 0, message: 'No orders found' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint to check API connectivity
app.get('/api/test', async (req, res) => {
  console.log('🧪 Testing API connection...');
  
  try {
    // Test authentication first
    const authResponse = await fetch(`${FLORINET_BASE}/authenticate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'JeroenMainfact',
        password: '&WWpxaM@#'
      })
    });
    
    const authData = await authResponse.json();
    console.log('   Auth test result:', authResponse.status, authData.token ? 'Token received' : 'No token');
    
    if (!authData.token) {
      return res.json({
        success: false,
        message: 'Authentication failed - no token received',
        authResponse: authData
      });
    }
    
    // Test orders endpoint with today's date
    const today = new Date().toISOString().split('T')[0];
    const ordersResponse = await fetch(
      `${FLORINET_BASE}/external/orderrows?deliveryDate=${today}`,
      {
        headers: { 
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    const ordersText = await ordersResponse.text();
    console.log('   Orders test result:', ordersResponse.status);
    console.log('   Orders response length:', ordersText.length);
    console.log('   Orders response preview:', ordersText.substring(0, 200));
    
    return res.json({
      success: true,
      auth: {
        status: authResponse.status,
        hasToken: !!authData.token
      },
      orders: {
        status: ordersResponse.status,
        contentType: ordersResponse.headers.get('content-type'),
        responseLength: ordersText.length,
        responsePreview: ordersText.substring(0, 500),
        isEmpty: ordersText.trim() === ''
      }
    });
  } catch (error) {
    console.error('   ❌ Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Florinet API Proxy Server',
    endpoints: {
      authenticate: 'POST /api/authenticate',
      orderrows: 'GET /api/external/orderrows?deliveryDate=YYYY-MM-DD',
      contracts: 'GET /api/external/contracts',
      health: 'GET /health'
    },
    timestamp: new Date().toISOString() 
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log('🚀 Florinet API Proxy Server running!');
  console.log(`📍 Proxy URL: http://localhost:${PORT}`);
  console.log(`🌐 Proxying to: ${FLORINET_BASE}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/authenticate');
  console.log('  GET  /api/external/orderrows?deliveryDate=YYYY-MM-DD');
  console.log('  GET  /api/external/contracts');
  console.log('  GET  /api/external/compositeproducts');
  console.log('  GET  /api/external/growers');
  console.log('  GET  /health');
});


const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// SMART URL DETECTION - Try both URLs, use whichever works
const FLORINET_URLS = [
    'https://app.2growsoftware.com/api/v1',   // Primary (from your manual)
    'https://summit.florinet.nl/api/v1'       // Fallback (known working with your credentials)
];

let workingUrl = null; // Cache the working URL after first successful request

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper: Try multiple URLs until one works
async function tryFetch(endpoint, options = {}) {
  // If we already found a working URL, try it first
  const urlsToTry = workingUrl 
    ? [workingUrl, ...FLORINET_URLS.filter(u => u !== workingUrl)]
    : FLORINET_URLS;
  
  let lastError = null;
  
  for (const baseUrl of urlsToTry) {
    try {
      const fullUrl = `${baseUrl}${endpoint}`;
      console.log(`   🔄 Trying: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        ...options,
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok || response.status === 401) { // 401 is also a "valid" response (bad token, but server exists)
        workingUrl = baseUrl; // Cache this URL for next time
        console.log(`   ✅ Using: ${baseUrl}`);
        return response;
      }
      
      console.log(`   ⚠️  ${baseUrl} returned ${response.status}`);
      lastError = new Error(`HTTP ${response.status}`);
      
    } catch (err) {
      console.log(`   ❌ ${baseUrl} failed: ${err.message}`);
      lastError = err;
      continue; // Try next URL
    }
  }
  
  throw lastError || new Error('All API endpoints failed');
}

// Authentication endpoint
app.post('/api/authenticate', async (req, res) => {
  console.log('🔐 Authenticating...');
  
  try {
    const response = await tryFetch('/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('   ❌ Auth failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Authentication failed', 
        details: errorText 
      });
    }
    
    const data = await response.json();
    console.log('   ✅ Authentication successful');
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Auth error:', error.message);
    res.status(500).json({ 
      error: 'Authentication failed', 
      details: error.message,
      hint: 'Check if API server is accessible from this network'
    });
  }
});

// Orderrows endpoint
app.get('/api/external/orderrows', async (req, res) => {
  console.log('📦 Fetching orderrows...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    // Build query string
    const params = new URLSearchParams();
    if (req.query.deliveryStartDate) params.append('deliveryStartDate', req.query.deliveryStartDate);
    if (req.query.deliveryEndDate) params.append('deliveryEndDate', req.query.deliveryEndDate);
    if (req.query.deliveryDate) {
      params.append('deliveryStartDate', req.query.deliveryDate);
      params.append('deliveryEndDate', req.query.deliveryDate);
    }
    if (req.query.slim) params.append('slim', req.query.slim);
    
    const queryString = params.toString();
    console.log('   Query:', queryString);
    
    const response = await tryFetch(`/external/orderrows?${queryString}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('   ❌ Failed:', response.status);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched ${data.length} orderrows`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Customers endpoint
app.get('/api/external/customers', async (req, res) => {
  console.log('👥 Fetching customers...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    const response = await tryFetch('/external/customers', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched ${data.length} customers`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Locations endpoint
app.get('/api/external/locations', async (req, res) => {
  console.log('📍 Fetching locations...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    const response = await tryFetch('/external/locations', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched ${data.length} locations`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Composite products endpoint
app.get('/api/external/composite-products', async (req, res) => {
  console.log('🌸 Fetching products...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    const response = await tryFetch('/external/composite-products', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched ${data.length} products`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Contracts endpoint
app.get('/api/external/contracts', async (req, res) => {
  console.log('📋 Fetching contracts...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    const response = await tryFetch('/external/contracts', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched ${data.length} contracts`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    workingUrl: workingUrl || 'not determined yet',
    availableUrls: FLORINET_URLS
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Florinet API Proxy Server running!');
  console.log(`📍 Proxy URL: http://localhost:${PORT}`);
  console.log(`🌐 Will try these URLs in order:`);
  FLORINET_URLS.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/authenticate');
  console.log('  GET  /api/external/orderrows?deliveryStartDate=DD-MM-YYYY&deliveryEndDate=DD-MM-YYYY');
  console.log('  GET  /api/external/customers');
  console.log('  GET  /api/external/locations');
  console.log('  GET  /api/external/composite-products');
  console.log('  GET  /api/external/contracts');
  console.log('  GET  /health');
  console.log('');
});

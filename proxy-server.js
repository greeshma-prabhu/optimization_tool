const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Using correct API URL as confirmed by manager
const FLORINET_API_BASE = 'https://app.2growsoftware.com/api/v1';

console.log('═══════════════════════════════════════════════════════');
console.log('🚀 Florinet API Proxy Server');
console.log('📍 Proxy URL: http://localhost:' + PORT);
console.log('🌐 API URL: ' + FLORINET_API_BASE);
console.log('⚠️  NO FALLBACK - ONLY CORRECT URL');
console.log('═══════════════════════════════════════════════════════');

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Authentication
app.post('/api/authenticate', async (req, res) => {
  console.log('🔐 Authenticating...');
  
  try {
    const response = await fetch(`${FLORINET_API_BASE}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Auth failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Authentication failed', 
        details: errorText 
      });
    }
    
    const data = await response.json();
    console.log('✅ Authentication successful');
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    res.status(500).json({ 
      error: 'Authentication failed', 
      details: error.message
    });
  }
});

// Orderrows
app.get('/api/external/orderrows', async (req, res) => {
  console.log('📦 Fetching orderrows...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token' });
    }
    
    const params = new URLSearchParams();
    if (req.query.deliveryStartDate) params.append('deliveryStartDate', req.query.deliveryStartDate);
    if (req.query.deliveryEndDate) params.append('deliveryEndDate', req.query.deliveryEndDate);
    if (req.query.deliveryDate) {
      params.append('deliveryStartDate', req.query.deliveryDate);
      params.append('deliveryEndDate', req.query.deliveryDate);
    }
    if (req.query.slim) params.append('slim', req.query.slim);
    
    const url = `${FLORINET_API_BASE}/external/orderrows?${params.toString()}`;
    console.log('   URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed:', response.status);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} orderrows`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Customers
app.get('/api/external/customers', async (req, res) => {
  console.log('👥 Fetching customers...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });
    
    const response = await fetch(`${FLORINET_API_BASE}/external/customers`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} customers`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Locations
app.get('/api/external/locations', async (req, res) => {
  console.log('📍 Fetching locations...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });
    
    const response = await fetch(`${FLORINET_API_BASE}/external/locations`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} locations`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Composite products
app.get('/api/external/composite-products', async (req, res) => {
  console.log('🌸 Fetching products...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });
    
    const response = await fetch(`${FLORINET_API_BASE}/external/composite-products`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} products`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Contracts
app.get('/api/external/contracts', async (req, res) => {
  console.log('📋 Fetching contracts...');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });
    
    const response = await fetch(`${FLORINET_API_BASE}/external/contracts`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} contracts`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    apiUrl: FLORINET_API_BASE
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/authenticate');
  console.log('  GET  /api/external/orderrows');
  console.log('  GET  /api/external/customers');
  console.log('  GET  /api/external/locations');
  console.log('  GET  /api/external/composite-products');
  console.log('  GET  /api/external/contracts');
  console.log('  GET  /health');
  console.log('');
  console.log('✅ Server ready!');
  console.log('═══════════════════════════════════════════════════════');
});

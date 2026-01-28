/**
 * Vercel Serverless Function - Florinet API Authentication
 * This runs on Vercel's servers, not in the user's browser
 * Handles authentication securely server-side
 */

// IMPORTANT: Store credentials in Vercel Environment Variables
// Go to Vercel Dashboard → Your Project → Settings → Environment Variables
const FLORINET_USERNAME = process.env.FLORINET_USERNAME || 'JeroenMainfact';
const FLORINET_PASSWORD = process.env.FLORINET_PASSWORD || '&WWpxaM@#';
const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

// In-memory token cache (will be cleared when function restarts)
// For production, consider using Vercel KV or similar for persistent caching
let tokenCache = {
    token: null,
    expiry: null
};

export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[Auth API] Authentication request received');

    try {
        // Check if we have a valid cached token
        if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
            console.log('[Auth API] Using cached token');
            return res.status(200).json({
                token: tokenCache.token,
                cached: true
            });
        }

        // Authenticate with Florinet
        console.log('[Auth API] Authenticating with Florinet...');
        console.log('[Auth API] Username:', FLORINET_USERNAME);
        console.log('[Auth API] Password length:', FLORINET_PASSWORD.length);
        
        const authResponse = await fetch(`${FLORINET_BASE_URL}/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: FLORINET_USERNAME.trim(),
                password: FLORINET_PASSWORD.trim()
            })
        });

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            console.error('[Auth API] Authentication failed:', authResponse.status, errorText);
            throw new Error(`Authentication failed: ${authResponse.status} - ${errorText}`);
        }

        const data = await authResponse.json();

        if (!data.token) {
            throw new Error('No token in response: ' + JSON.stringify(data));
        }

        // Cache token for 50 minutes (tokens typically expire in 60 minutes)
        tokenCache = {
            token: data.token,
            expiry: Date.now() + (50 * 60 * 1000)
        };

        console.log('[Auth API] Authentication successful');
        console.log('[Auth API] Token cached until:', new Date(tokenCache.expiry).toISOString());

        return res.status(200).json({
            token: data.token,
            cached: false
        });

    } catch (error) {
        console.error('[Auth API] Error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
}


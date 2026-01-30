/**
 * Vercel Serverless Function - Authenticate with Florinet API
 * Base URL: https://app.2growsoftware.com/api/v1 (NOT summit.florinet.nl)
 */

const FLORINET_BASE_URL = 'https://app.2growsoftware.com/api/v1';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[Auth API] Authenticating with Florinet...');

    try {
        // Get credentials from environment variables (Vercel env vars)
        const username = (process.env.FLORINET_USERNAME || '').trim();
        const password = (process.env.FLORINET_PASSWORD || '').trim();

        if (!username || !password) {
            console.error('[Auth API] Missing credentials');
            return res.status(500).json({ 
                error: 'Server configuration error: Missing FLORINET credentials' 
            });
        }

        console.log('[Auth API] Username:', username);
        console.log('[Auth API] Password length:', password.length);

        // Authenticate with Florinet
        const authUrl = `${FLORINET_BASE_URL}/authenticate`;
        console.log('[Auth API] Authenticating at:', authUrl);

        const authResponse = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        console.log('[Auth API] Response status:', authResponse.status);

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            console.error('[Auth API] Authentication failed:', authResponse.status, errorText);
            return res.status(authResponse.status).json({
                error: 'Florinet authentication failed',
                message: errorText
            });
        }

        const data = await authResponse.json();

        if (!data.token) {
            console.error('[Auth API] No token in response:', data);
            return res.status(500).json({ 
                error: 'No token in authentication response' 
            });
        }

        console.log('[Auth API] ✅ Authentication successful');
        console.log('[Auth API] Token length:', data.token.length);

        return res.status(200).json({
            token: data.token,
            expires_at: data.expires_at
        });

    } catch (error) {
        console.error('[Auth API] Error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
};

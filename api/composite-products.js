/**
 * Vercel Serverless Function - Fetch Composite Products
 * Base URL: https://summit.florinet.nl/api/v1
 */

const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Build URL for composite products
        const url = `${FLORINET_BASE_URL}/external/composite-products`;

        console.log('[Products API] Fetching from:', url);

        // Make request to Florinet API
        const productsResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!productsResponse.ok) {
            if (productsResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }

        const products = await productsResponse.json();
        console.log(`[Products API] ✅ Fetched ${products?.length || 0} products`);

        return res.status(200).json(products);

    } catch (error) {
        console.error('[Products API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message
        });
    }
};


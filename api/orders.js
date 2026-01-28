/**
 * Vercel Serverless Function - Fetch Orders from Florinet API
 * Proxies requests to Florinet API with authentication
 */

const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[Orders API] Fetching orders...');

    try {
        // Get token from request header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Get query parameters
        const { deliveryStartDate, deliveryEndDate, slim } = req.query;

        // Build URL
        const url = new URL(`${FLORINET_BASE_URL}/external/orders`);
        if (deliveryStartDate) url.searchParams.append('deliveryStartDate', deliveryStartDate);
        if (deliveryEndDate) url.searchParams.append('deliveryEndDate', deliveryEndDate);
        if (slim) url.searchParams.append('slim', slim);

        console.log('[Orders API] Fetching from:', url.toString());

        // Fetch orders from Florinet
        const ordersResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!ordersResponse.ok) {
            const errorText = await ordersResponse.text();
            console.error('[Orders API] Fetch failed:', ordersResponse.status, errorText);
            
            // If 401, token might be expired
            if (ordersResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            
            throw new Error(`Failed to fetch orders: ${ordersResponse.status} - ${errorText}`);
        }

        const orders = await ordersResponse.json();

        console.log('[Orders API] Successfully fetched', Array.isArray(orders) ? orders.length : 'unknown', 'orders');

        return res.status(200).json(orders);

    } catch (error) {
        console.error('[Orders API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch orders',
            message: error.message
        });
    }
}


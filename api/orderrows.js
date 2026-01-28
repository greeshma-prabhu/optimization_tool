/**
 * Vercel Serverless Function - Fetch Order Rows from Florinet API
 * Proxies requests to Florinet API with authentication
 */

const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[OrderRows API] Fetching order rows...');

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
        const url = new URL(`${FLORINET_BASE_URL}/external/orderrows`);
        if (deliveryStartDate) url.searchParams.append('deliveryStartDate', deliveryStartDate);
        if (deliveryEndDate) url.searchParams.append('deliveryEndDate', deliveryEndDate);
        if (slim) url.searchParams.append('slim', slim);

        console.log('[OrderRows API] Fetching from:', url.toString());

        // Fetch order rows from Florinet
        const orderrowsResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!orderrowsResponse.ok) {
            const errorText = await orderrowsResponse.text();
            console.error('[OrderRows API] Fetch failed:', orderrowsResponse.status, errorText);
            
            // If 401, token might be expired
            if (orderrowsResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            
            throw new Error(`Failed to fetch order rows: ${orderrowsResponse.status} - ${errorText}`);
        }

        const orderrows = await orderrowsResponse.json();

        console.log('[OrderRows API] Successfully fetched', Array.isArray(orderrows) ? orderrows.length : 'unknown', 'order rows');

        return res.status(200).json(orderrows);

    } catch (error) {
        console.error('[OrderRows API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch order rows',
            message: error.message
        });
    }
}


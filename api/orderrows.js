/**
 * Vercel Serverless Function - Fetch Orderrows
 * Base URL: https://summit.florinet.nl/api/v1
 */

const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[Orderrows API] Fetching orderrows...');

    try {
        // Get token from Authorization header
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

        console.log('[Orderrows API] Fetching from:', url.toString());

        // Fetch from Florinet (using native fetch - Node 18+)
        const orderrowsResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!orderrowsResponse.ok) {
            const errorText = await orderrowsResponse.text();
            console.error('[Orderrows API] Fetch failed:', orderrowsResponse.status, errorText);
            
            if (orderrowsResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            
            throw new Error(`Failed to fetch orderrows: ${orderrowsResponse.status} - ${errorText}`);
        }

        const orderrows = await orderrowsResponse.json();

        console.log('[Orderrows API] ✅ Fetched', Array.isArray(orderrows) ? orderrows.length : 'unknown', 'orderrows');

        return res.status(200).json(orderrows);

    } catch (error) {
        console.error('[Orderrows API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch orderrows',
            message: error.message
        });
    }
}

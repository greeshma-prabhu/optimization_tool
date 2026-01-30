/**
 * Vercel Serverless Function - Fetch Customers
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

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Build URL for customers
        const url = `${FLORINET_BASE_URL}/external/customers`;

        console.log('[Customers API] Fetching from:', url);

        // Make request to Florinet API
        const customersResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!customersResponse.ok) {
            if (customersResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }

        const customers = await customersResponse.json();
        console.log(`[Customers API] ✅ Fetched ${customers?.length || 0} customers`);

        return res.status(200).json(customers);

    } catch (error) {
        console.error('[Customers API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch customers',
            message: error.message
        });
    }
};


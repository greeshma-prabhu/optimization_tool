/**
 * Vercel Serverless Function - Fetch Locations
 * Proxies requests to Florinet API /external/locations endpoint
 */

const FLORINET_BASE_URL = 'https://summit.florinet.nl/api/v1';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

        // Build URL for locations
        const url = new URL(`${FLORINET_BASE_URL}/external/locations`);

        console.log('Fetching locations from:', url.toString());

        // Make request to Florinet API
        const locationsResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!locationsResponse.ok) {
            if (locationsResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            throw new Error(`Failed to fetch locations: ${locationsResponse.status}`);
        }

        const locations = await locationsResponse.json();
        console.log(`Received ${locations?.length || 0} locations`);

        return res.status(200).json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        return res.status(500).json({
            error: 'Failed to fetch locations',
            details: error.message
        });
    }
};



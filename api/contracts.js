/**
 * Vercel Serverless Function - Fetch Contracts (Customer/Company Data)
 * Proxies requests to Florinet API /external/contracts endpoint
 */

const FLORINET_BASE_URL = 'https://app.2growsoftware.com/api/v1';

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

        // Build URL
        const url = new URL(`${FLORINET_BASE_URL}/external/contracts`);

        console.log('Fetching contracts from:', url.toString());

        // Make request to Florinet API
        const contractsResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!contractsResponse.ok) {
            if (contractsResponse.status === 401) {
                return res.status(401).json({ error: 'Token expired', needsRefresh: true });
            }
            throw new Error(`Failed to fetch contracts: ${contractsResponse.status}`);
        }

        const contracts = await contractsResponse.json();
        console.log(`Received ${contracts?.length || 0} contracts`);

        return res.status(200).json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        return res.status(500).json({
            error: 'Failed to fetch contracts',
            details: error.message
        });
    }
};



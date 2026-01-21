/**
 * Zuidplas Logistics - Florinet API Client
 * Handles all API communication with Florinet Summit
 */

class FlorinetAPI {
    constructor() {
        // Use proxy server to bypass CORS
        this.baseURL = 'http://localhost:3001/api';
        this.originalBaseURL = 'https://summit.florinet.nl/api/v1';
        this.authManager = authManager;
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        try {
            // Get valid token
            const token = await this.authManager.getValidToken();
            
            // Set default headers
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Make request
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });

            // Handle token expiry
            if (response.status === 401) {
                // Token expired, re-authenticate
                const newToken = await this.authManager.authenticate();
                headers['Authorization'] = `Bearer ${newToken}`;
                
                // Retry request
                const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
                    ...options,
                    headers
                });
                
                if (!retryResponse.ok) {
                    throw new Error(`API request failed: ${retryResponse.status}`);
                }
                
                return await retryResponse.json();
            }

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Get orders for a specific date
     */
    async getOrders(deliveryDate) {
        try {
            // Format date as YYYY-MM-DD
            const dateStr = deliveryDate instanceof Date 
                ? deliveryDate.toISOString().split('T')[0]
                : deliveryDate;
            
            const data = await this.request(`/external/orderrows?deliveryDate=${dateStr}`);
            return data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    }

    /**
     * Get today's orders
     */
    async getTodaysOrders() {
        const today = new Date();
        return await this.getOrders(today);
    }

    /**
     * Get all contracts
     */
    async getContracts() {
        try {
            return await this.request('/external/contracts');
        } catch (error) {
            console.error('Error fetching contracts:', error);
            throw error;
        }
    }

    /**
     * Get composite products
     */
    async getCompositeProducts() {
        try {
            return await this.request('/external/compositeproducts');
        } catch (error) {
            console.error('Error fetching composite products:', error);
            throw error;
        }
    }

    /**
     * Get base products
     */
    async getBaseProducts() {
        try {
            return await this.request('/external/base-products');
        } catch (error) {
            console.error('Error fetching base products:', error);
            throw error;
        }
    }

    /**
     * Get product groups
     */
    async getProductGroups() {
        try {
            return await this.request('/external/product-groups');
        } catch (error) {
            console.error('Error fetching product groups:', error);
            throw error;
        }
    }

    /**
     * Get growers (includes m² data)
     */
    async getGrowers() {
        try {
            return await this.request('/external/growers');
        } catch (error) {
            console.error('Error fetching growers:', error);
            throw error;
        }
    }
}

// Global instance
const florinetAPI = new FlorinetAPI();


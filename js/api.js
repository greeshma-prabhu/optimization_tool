/**
 * Zuidplas Logistics - Florinet API Client
 * Handles all API communication with Florinet Summit
 */

class FlorinetAPI {
    constructor() {
        // Use proxy server to bypass CORS (required for browser)
        // Proxy server must be running on localhost:3001
        this.baseURL = 'http://localhost:3001/api';
        this.originalBaseURL = 'https://summit.florinet.nl/api/v1';
        this.username = 'JeroenMainfact';
        this.password = '&WWpxaM@#';
        this.token = null;
        this.tokenExpiry = null;
        this.authManager = authManager;
        
        // Auto-refresh settings
        this.autoRefreshInterval = null;
        this.refreshIntervalMs = 5 * 60 * 1000; // 5 minutes
        
        console.log('=================================');
        console.log('🚀 FlorinetAPI INITIALIZED');
        console.log('Base URL (Proxy):', this.baseURL);
        console.log('Original API URL:', this.originalBaseURL);
        console.log('Username:', this.username);
        console.log('Password length:', this.password.length);
        console.log('=================================');
    }

    /**
     * Convert ISO date (YYYY-MM-DD) to Florinet format (DD-MM-YYYY)
     */
    toFlorinetDate(isoDate) {
        if (!isoDate) return null;
        const date = isoDate instanceof Date 
            ? isoDate.toISOString().split('T')[0]
            : isoDate;
        const [year, month, day] = date.split('-');
        const result = `${day}-${month}-${year}`;
        console.log(`📅 Date conversion: ${isoDate} → ${result}`);
        return result;
    }

    /**
     * Convert Florinet date (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
     */
    fromFlorinetDate(florinetDate) {
        if (!florinetDate) return null;
        const [day, month, year] = florinetDate.split('-');
        return `${year}-${month}-${day}`;
    }

    /**
     * Authenticate with detailed logging - NO FALLBACK
     * Uses proxy server to bypass CORS
     */
    async authenticate() {
        console.log('=================================');
        console.log('🔐 AUTHENTICATING...');
        console.log('URL (via proxy):', `${this.baseURL}/authenticate`);
        console.log('Username:', this.username);
        console.log('Password length:', this.password.length);
        console.log('=================================');
        
        try {
            const requestBody = {
                username: this.username.trim(),
                password: this.password.trim()
            };
            
            console.log('📤 Sending authentication request via proxy...');
            
            const response = await fetch(`${this.baseURL}/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

            const responseText = await response.text();
            console.log('📥 Response body:', responseText);

            if (!response.ok) {
                throw new Error(`Authentication failed: HTTP ${response.status} - ${responseText}`);
            }

            const data = JSON.parse(responseText);
            
            if (!data.token) {
                throw new Error('No token in response: ' + JSON.stringify(data));
            }

            this.token = data.token;
            this.tokenExpiry = Date.now() + (50 * 60 * 1000);
            
            localStorage.setItem('florinet_token', this.token);
            localStorage.setItem('florinet_token_expiry', this.tokenExpiry);
            
            console.log('✅ AUTHENTICATION SUCCESS');
            console.log('Token (first 50 chars):', this.token.substring(0, 50) + '...');
            console.log('Token expires in 50 minutes');
            console.log('=================================');
            
            return this.token;
            
        } catch (error) {
            console.error('=================================');
            console.error('❌ AUTHENTICATION FAILED');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('=================================');
            throw new Error(`API Authentication Failed: ${error.message}. Please check credentials and network connection.`);
        }
    }

    /**
     * Get valid token - NO FALLBACK
     */
    async getToken() {
        // Check if token is still valid
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log('✅ Using cached token (valid for', Math.round((this.tokenExpiry - Date.now()) / 1000 / 60), 'more minutes)');
            return this.token;
        }
        
        // Check localStorage
        const storedToken = localStorage.getItem('florinet_token');
        const storedExpiry = localStorage.getItem('florinet_token_expiry');
        
        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
            this.token = storedToken;
            this.tokenExpiry = parseInt(storedExpiry);
            console.log('✅ Using stored token');
            return this.token;
        }
        
        console.log('⚠️ Token expired or missing, re-authenticating...');
        return await this.authenticate();
    }

    /**
     * Make authenticated API request - NO FALLBACK
     * (This method is kept for backward compatibility but uses new auth methods)
     */
    async request(endpoint, options = {}) {
        try {
            // Get valid token - throws if fails
            const token = await this.getToken();
            
            if (!token) {
                throw new Error('No authentication token available. Authentication failed.');
            }
            
            // Set default headers
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            };

            console.log(`📤 Making request to: ${this.baseURL}${endpoint}`);

            // Make request
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });

            console.log('📥 Response status:', response.status);

            // Handle token expiry
            if (response.status === 401) {
                console.log('⚠️ Token expired (401), re-authenticating...');
                const newToken = await this.authenticate();
                headers['Authorization'] = `Bearer ${newToken}`;
                
                // Retry request
                const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
                    ...options,
                    headers
                });
                
                console.log('📥 Retry response status:', retryResponse.status);
                
                if (!retryResponse.ok) {
                    const errorText = await retryResponse.text();
                    throw new Error(`API request failed after retry: HTTP ${retryResponse.status} - ${errorText}`);
                }
                
                const result = await retryResponse.json();
                console.log('✅ Request successful after retry');
                return result;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: HTTP ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Request successful');
            return result;
            
        } catch (error) {
            console.error('=================================');
            console.error('❌ API REQUEST FAILED');
            console.error('Endpoint:', endpoint);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('=================================');
            throw error;
        }
    }

    /**
     * Get orders for a specific date - NO FALLBACK
     * @param {Date|string} deliveryDate - Date in Date object or YYYY-MM-DD format
     */
    async getOrders(deliveryDate) {
        try {
            // Format date as DD-MM-YYYY for Florinet API
            const dateStr = deliveryDate instanceof Date 
                ? deliveryDate.toISOString().split('T')[0]
                : deliveryDate;
            
            const florinetDate = this.toFlorinetDate(dateStr);
            console.log(`[FlorinetAPI] Fetching orders for date: ${florinetDate} (${dateStr})`);
            
            const data = await this.getOrdersRange(florinetDate, florinetDate);
            
            console.log(`[FlorinetAPI] ✅ Received ${data.length} orders`);
            return data || [];
        } catch (error) {
            console.error('[FlorinetAPI] Error fetching orders:', error);
            throw error; // Throw instead of returning empty array
        }
    }

    /**
     * Get orders for a date range - NO FALLBACK
     * Fetches both orderrows and full orders, then joins them to get customer/location
     * @param {string} startDate - Start date in DD-MM-YYYY format
     * @param {string} endDate - End date in DD-MM-YYYY format
     */
    async getOrdersRange(startDate, endDate) {
        console.log('=================================');
        console.log('🔍 GET ORDERS RANGE (with customer/location)');
        console.log('Start date:', startDate);
        console.log('End date:', endDate);
        console.log('=================================');
        
        try {
            const token = await this.getToken();
            
            // Fetch orderrows (has quantity, product info)
            const orderrowsUrl = new URL(`${this.baseURL}/external/orderrows`);
            orderrowsUrl.searchParams.append('deliveryStartDate', startDate);
            orderrowsUrl.searchParams.append('deliveryEndDate', endDate);
            orderrowsUrl.searchParams.append('slim', '1');
            
            console.log('📤 Fetching orderrows:', orderrowsUrl.toString());
            
            const orderrowsResponse = await fetch(orderrowsUrl.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (orderrowsResponse.status === 401) {
                console.log('⚠️ Token expired (401), re-authenticating...');
                await this.authenticate();
                
                const retryResponse = await fetch(orderrowsUrl.toString(), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!retryResponse.ok) {
                    const errorText = await retryResponse.text();
                    throw new Error(`Retry failed: HTTP ${retryResponse.status} - ${errorText}`);
                }
                
                const orderrows = await retryResponse.json();
                return await this.joinWithFullOrders(orderrows, startDate, endDate, token);
            }

            if (!orderrowsResponse.ok) {
                const errorText = await orderrowsResponse.text();
                throw new Error(`HTTP ${orderrowsResponse.status}: ${errorText}`);
            }

            const orderrows = await orderrowsResponse.json();
            console.log('✅ Received', orderrows.length, 'orderrows');
            
            // Fetch full orders (has customer/location) and join
            return await this.joinWithFullOrders(orderrows, startDate, endDate, token);
            
        } catch (error) {
            console.error('=================================');
            console.error('❌ GET ORDERS FAILED');
            console.error('Error:', error);
            console.error('=================================');
            throw error;
        }
    }
    
    /**
     * Join orderrows with full orders to get customer/location info
     */
    async joinWithFullOrders(orderrows, startDate, endDate, token) {
        console.log('=================================');
        console.log('🔗 JOINING ORDERROWS WITH FULL ORDERS');
        console.log(`Orderrows: ${orderrows.length}`);
        console.log('=================================');
        
        try {
            // Fetch full orders
            const ordersUrl = new URL(`${this.baseURL}/external/orders`);
            ordersUrl.searchParams.append('deliveryStartDate', startDate);
            ordersUrl.searchParams.append('deliveryEndDate', endDate);
            
            console.log('📤 Fetching full orders:', ordersUrl.toString());
            
            const ordersResponse = await fetch(ordersUrl.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            let fullOrders = [];
            if (ordersResponse.ok) {
                fullOrders = await ordersResponse.json() || [];
                console.log('✅ Received', fullOrders.length, 'full orders');
                
                // Log first full order structure to debug
                if (fullOrders.length > 0) {
                    console.log('📋 First full order structure:', JSON.stringify(fullOrders[0], null, 2).substring(0, 500));
                    console.log('📋 Full order fields:', Object.keys(fullOrders[0]));
                }
            } else {
                const errorText = await ordersResponse.text();
                console.log('⚠️ Full orders endpoint failed (status:', ordersResponse.status, ')');
                console.log('   Response:', errorText.substring(0, 200));
            }
            
            // Create a map of order_id -> full order for quick lookup
            const ordersMap = {};
            fullOrders.forEach(order => {
                // Try multiple ID fields
                const orderId = order.id || order.order_id || order.orderId;
                if (orderId) {
                    ordersMap[orderId] = order;
                }
            });
            
            console.log(`📊 Created orders map with ${Object.keys(ordersMap).length} orders`);
            
            // Join orderrows with full orders
            let joinedCount = 0;
            let sampleJoined = null;
            
            const joinedOrders = orderrows.map(orderrow => {
                const orderId = orderrow.order_id;
                const fullOrder = ordersMap[orderId];
                
                if (fullOrder) {
                    joinedCount++;
                    if (!sampleJoined) {
                        sampleJoined = { orderrow, fullOrder };
                    }
                    
                    // Extract customer from full order - TRY EVERY POSSIBLE FIELD
                    // Check nested structures too (order.customer, order.client, etc.)
                    let customer = '';
                    const customerFields = [
                        // Direct fields
                        fullOrder.customer,
                        fullOrder.customer_name,
                        fullOrder.customerName,
                        fullOrder.client,
                        fullOrder.client_name,
                        fullOrder.clientName,
                        fullOrder.company,
                        fullOrder.company_name,
                        fullOrder.companyName,
                        fullOrder.name,
                        fullOrder.buyer,
                        fullOrder.buyer_name,
                        // Nested structures
                        fullOrder.customer?.name,
                        fullOrder.customer?.customerName,
                        fullOrder.customer?.clientName,
                        fullOrder.client?.name,
                        fullOrder.client?.customerName,
                        fullOrder.order?.customer,
                        fullOrder.order?.customer_name,
                        fullOrder.order?.client,
                        fullOrder.order?.client_name,
                    ];
                    
                    for (const field of customerFields) {
                        if (field && typeof field === 'string' && field.trim() !== '') {
                            customer = field.trim();
                            break;
                        } else if (field && typeof field === 'object' && field.name) {
                            customer = field.name.trim();
                            break;
                        }
                    }
                    
                    // Extract location from full order - TRY EVERY POSSIBLE FIELD
                    let location = '';
                    const locationFields = [
                        // Direct fields
                        fullOrder.delivery_location,
                        fullOrder.location,
                        fullOrder.delivery_address,
                        fullOrder.deliveryAddress,
                        fullOrder.hub,
                        fullOrder.delivery_hub,
                        fullOrder.address,
                        fullOrder.deliveryAddress,
                        fullOrder.destination,
                        fullOrder.delivery_destination,
                        // Nested structures
                        fullOrder.delivery?.location,
                        fullOrder.delivery?.address,
                        fullOrder.delivery?.hub,
                        fullOrder.order?.delivery_location,
                        fullOrder.order?.location,
                        fullOrder.order?.hub,
                    ];
                    
                    for (const field of locationFields) {
                        if (field && typeof field === 'string' && field.trim() !== '') {
                            location = field.trim();
                            break;
                        }
                    }
                    
                    // Merge: use orderrow data but add customer/location from full order
                    return {
                        ...orderrow,
                        // Add customer/location from full order
                        customer: customer,
                        customer_name: customer,
                        delivery_location: location,
                        location: location,
                        // Keep orderrow data for quantity, product, etc.
                        _joined: true,
                        _fullOrderId: orderId
                    };
                } else {
                    // No matching full order - use orderrow as-is
                    return {
                        ...orderrow,
                        _joined: false
                    };
                }
            });
            
            console.log(`✅ Joined ${joinedCount} of ${orderrows.length} orderrows with full orders`);
            
            if (sampleJoined) {
                console.log('📋 Sample joined order:', {
                    orderrow_id: sampleJoined.orderrow.id,
                    order_id: sampleJoined.orderrow.order_id,
                    fullOrder_id: sampleJoined.fullOrder.id,
                    customer: sampleJoined.fullOrder.customer || sampleJoined.fullOrder.customer_name || 'NOT FOUND',
                    location: sampleJoined.fullOrder.delivery_location || sampleJoined.fullOrder.location || 'NOT FOUND'
                });
            }
            
            if (joinedCount === 0 && orderrows.length > 0) {
                console.error('❌ ERROR: No orderrows were joined with full orders!');
                console.error('   This means customer/location data will be missing.');
                console.error('   Sample orderrow order_id:', orderrows[0].order_id);
                console.error('   Available order IDs in map:', Object.keys(ordersMap).slice(0, 10));
            }
            
            console.log('=================================');
            return joinedOrders;
            
        } catch (error) {
            console.error('❌ Failed to join with full orders:', error.message);
            console.error('   Stack:', error.stack);
            console.error('   Returning orderrows without customer/location data');
            // Return orderrows as-is if join fails
            return orderrows;
        }
    }

    /**
     * Fetch full orders (not just orderrows) to get customer/location info
     * @param {string} startDate - Start date in DD-MM-YYYY format
     * @param {string} endDate - End date in DD-MM-YYYY format
     */
    async getFullOrders(startDate, endDate) {
        console.log('=================================');
        console.log('🔍 GET FULL ORDERS (with customer/location)');
        console.log('Start date:', startDate);
        console.log('End date:', endDate);
        console.log('=================================');
        
        try {
            const token = await this.getToken();
            
            // Try /external/orders endpoint (full orders, not just orderrows)
            const url = new URL(`${this.baseURL}/external/orders`);
            url.searchParams.append('deliveryStartDate', startDate);
            url.searchParams.append('deliveryEndDate', endDate);
            
            console.log('📤 Request URL (full orders):', url.toString());
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const orders = await response.json();
                console.log('✅ Received', orders.length, 'full orders');
                return orders || [];
            } else {
                console.log('⚠️ Full orders endpoint not available, will use orderrows only');
                return null; // Indicate we need to use orderrows
            }
        } catch (error) {
            console.log('⚠️ Full orders fetch failed:', error.message);
            return null; // Will fall back to orderrows
        }
    }

    /**
     * Fetch orders for a specific date
     * @param {Date|string} targetDate - Date to fetch orders for (optional, defaults to today)
     */
    async fetchOrdersForDate(targetDate = null) {
        console.log('=================================');
        console.log('📦 FETCHING ORDERS FOR DATE');
        console.log('=================================');
        
        try {
            let dateToFetch;
            
            if (targetDate) {
                // Use provided date
                dateToFetch = targetDate instanceof Date 
                    ? targetDate 
                    : new Date(targetDate);
            } else {
                // Default to today
                dateToFetch = new Date();
            }
            
            // Normalize to start of day
            const fetchDate = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth(), dateToFetch.getDate());
            const dateISO = fetchDate.toISOString().split('T')[0];
            const florinetDate = this.toFlorinetDate(dateISO);
            
            console.log('Target date (ISO):', dateISO);
            console.log('Target date (Florinet):', florinetDate);
            
            // Fetch orders for this specific date
            const orders = await this.getOrdersRange(florinetDate, florinetDate);
            
            console.log('✅ RECEIVED', orders.length, 'ORDERS');
            if (orders.length > 0) {
                console.log('First order sample:', JSON.stringify(orders[0], null, 2));
            } else {
                console.log('ℹ️ Empty array [] - No orders for this date (this is normal)');
            }
            console.log('=================================');
            
            return orders;
            
        } catch (error) {
            console.error('=================================');
            console.error('❌ FETCH ORDERS FAILED');
            console.error('Error:', error);
            console.error('=================================');
            throw error;
        }
    }

    /**
     * Fetch orders from previous day until 7 AM today
     * This is the main function for daily planning
     * @param {Date|string} targetDate - Optional date to use instead of today
     */
    async fetchOrdersForPlanning(targetDate = null) {
        console.log('=================================');
        console.log('📦 FETCHING ORDERS FOR PLANNING');
        console.log('=================================');
        
        try {
            let today;
            
            if (targetDate) {
                // Use provided date as "today"
                today = targetDate instanceof Date 
                    ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
                    : new Date(targetDate);
            } else {
                // Default to actual today
                const now = new Date();
                today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }
            
            // Get yesterday's date
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Convert to ISO format first, then to Florinet format
            const yesterdayISO = yesterday.toISOString().split('T')[0];
            const todayISO = today.toISOString().split('T')[0];
            
            const startDate = this.toFlorinetDate(yesterdayISO);
            const endDate = this.toFlorinetDate(todayISO);
            
            console.log('Date range (ISO):', yesterdayISO, 'to', todayISO);
            console.log('Date range (Florinet):', startDate, 'to', endDate);
            
            const orders = await this.getOrdersRange(startDate, endDate);
            
            console.log('✅ RECEIVED', orders.length, 'ORDERS');
            if (orders.length > 0) {
                console.log('First order sample:', JSON.stringify(orders[0], null, 2));
            } else {
                console.log('ℹ️ Empty array [] - No orders for this date range (this is normal)');
            }
            console.log('=================================');
            
            return orders;
            
        } catch (error) {
            console.error('=================================');
            console.error('❌ FETCH ORDERS FAILED');
            console.error('Error:', error);
            console.error('=================================');
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
     * Start auto-refresh
     * Automatically fetches orders every X minutes
     */
    startAutoRefresh(callback) {
        console.log(`[FlorinetAPI] Starting auto-refresh (every ${this.refreshIntervalMs / 1000}s)`);
        
        // Clear existing interval if any
        this.stopAutoRefresh();
        
        // Set up new interval
        this.autoRefreshInterval = setInterval(async () => {
            console.log('[FlorinetAPI] 🔄 Auto-refresh triggered');
            try {
                await callback();
            } catch (error) {
                console.error('[FlorinetAPI] Auto-refresh failed:', error);
            }
        }, this.refreshIntervalMs);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('[FlorinetAPI] Auto-refresh stopped');
        }
    }

    /**
     * Set refresh interval
     * @param {number} minutes - Interval in minutes
     */
    setRefreshInterval(minutes) {
        this.refreshIntervalMs = minutes * 60 * 1000;
        console.log(`[FlorinetAPI] Refresh interval set to ${minutes} minutes`);
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


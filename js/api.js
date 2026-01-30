/**
 * Florinet API Client - REBUILT FROM MANUAL
 * Base URL: https://app.2growsoftware.com/api/v1
 * Following FLORINET_API_MANUAL.md exactly
 */

class FlorinetAPI {
    constructor() {
        // Environment detection
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isVercel = hostname.includes('vercel.app') || hostname.includes('vercel.com');
        
        // PROXY ROUTING
        if (isLocalhost && !isVercel) {
            // Local: use proxy server
            this.baseURL = 'http://localhost:3001/api';
            this.isLocalhost = true;
            console.log('🔧 LOCAL MODE - Using proxy: http://localhost:3001/api');
        } else {
            // Production: use Vercel serverless functions
            this.baseURL = '/api';
            this.isLocalhost = false;
            console.log('🌐 PRODUCTION MODE - Using serverless: /api');
        }
        
        this.token = null;
        this.tokenExpiry = null;
        
        // Cached lookup maps
        this.customerMap = new Map();
        this.locationMap = new Map();
        this.productMap = new Map();
        
        console.log('✅ FlorinetAPI initialized');
    }

    /**
     * Convert ISO date (YYYY-MM-DD) to Florinet format (dd-mm-YYYY)
     */
    toFlorinetDate(isoDate) {
        if (!isoDate) return null;
        const date = isoDate instanceof Date 
            ? isoDate.toISOString().split('T')[0]
            : isoDate;
        const [year, month, day] = date.split('-');
        return `${day}-${month}-${year}`;
    }

    /**
     * Authenticate with Florinet API
     * Returns JWT token
     */
    async authenticate() {
        console.log('🔐 Authenticating with Florinet...');
        
        try {
            const authUrl = this.isLocalhost 
                ? `${this.baseURL}/authenticate`
                : `${window.location.origin}${this.baseURL}/authenticate`;
            
            console.log('📤 Auth URL:', authUrl);
            
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: HTTP ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.token) {
                throw new Error('No token in response');
            }

            this.token = data.token;
            // Token expires in ~60 minutes, cache for 50 minutes to be safe
            this.tokenExpiry = Date.now() + (50 * 60 * 1000);
            
            // Store in localStorage
            localStorage.setItem('florinet_token', this.token);
            localStorage.setItem('florinet_token_expiry', this.tokenExpiry);
            
            console.log('✅ Authentication successful');
            console.log('   Token expires in 50 minutes');
            
            return this.token;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw error;
        }
    }

    /**
     * Get valid token (from cache or by authenticating)
     */
    async getToken() {
        // Check memory cache
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            const minutesLeft = Math.round((this.tokenExpiry - Date.now()) / 1000 / 60);
            console.log(`✅ Using cached token (${minutesLeft} min left)`);
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
        
        // Token expired or missing - re-authenticate
        console.log('⚠️ Token expired or missing, authenticating...');
        return await this.authenticate();
    }

    /**
     * Make authenticated API request
     */
    async fetchWithAuth(endpoint, params = {}) {
        const token = await this.getToken();
        
        // Build URL
        const url = new URL(
            this.isLocalhost 
                ? `${this.baseURL}${endpoint}`
                : `${window.location.origin}${this.baseURL}${endpoint}`
        );
        
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, value);
            }
        });

        console.log(`📤 GET ${url.toString()}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        // Handle token expiry
        if (response.status === 401) {
            console.log('⚠️ Token expired (401), re-authenticating...');
            await this.authenticate();
            
            // Retry with new token
            const retryResponse = await fetch(url.toString(), {
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
            
            return retryResponse.json();
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: HTTP ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Load all lookup data (customers, locations, products)
     * Call this ONCE at startup
     */
    async loadLookupData() {
        console.log('=================================');
        console.log('📋 LOADING LOOKUP DATA');
        console.log('=================================');
        
        try {
            // Fetch all in parallel
            const [customers, locations, products] = await Promise.all([
                this.fetchWithAuth('/external/customers'),
                this.fetchWithAuth('/external/locations'),
                this.fetchWithAuth('/external/composite-products')
            ]);
            
            // Build customer map: id → customer object
            this.customerMap.clear();
            customers.forEach(customer => {
                this.customerMap.set(customer.id, customer);
            });
            console.log(`✅ Loaded ${this.customerMap.size} customers`);
            if (customers[0]) {
                console.log('   Sample customer:', {
                    id: customers[0].id,
                    name: customers[0].name,
                    fields: Object.keys(customers[0])
                });
            }
            
            // Build location map: id → location object
            this.locationMap.clear();
            locations.forEach(location => {
                this.locationMap.set(location.id, location);
            });
            console.log(`✅ Loaded ${this.locationMap.size} locations`);
            if (locations[0]) {
                console.log('   Sample location:', {
                    id: locations[0].id,
                    name: locations[0].name,
                    fields: Object.keys(locations[0])
                });
            }
            
            // Build product map: id → product object
            this.productMap.clear();
            products.forEach(product => {
                this.productMap.set(product.id, product);
            });
            console.log(`✅ Loaded ${this.productMap.size} products`);
            if (products[0]) {
                console.log('   Sample product:', {
                    id: products[0].id,
                    name: products[0].name,
                    fields: Object.keys(products[0])
                });
            }
            
            console.log('=================================');
            
            return {
                customers: this.customerMap,
                locations: this.locationMap,
                products: this.productMap
            };
            
        } catch (error) {
            console.error('❌ Failed to load lookup data:', error);
            // Don't throw - app can still work with orderrow data
            return {
                customers: this.customerMap,
                locations: this.locationMap,
                products: this.productMap
            };
        }
    }

    /**
     * Fetch orders for a date range
     * @param {string} startDate - dd-mm-YYYY format
     * @param {string} endDate - dd-mm-YYYY format
     */
    async getOrdersRange(startDate, endDate) {
        console.log('=================================');
        console.log('📦 FETCHING ORDERROWS');
        console.log(`   Date range: ${startDate} to ${endDate}`);
        console.log('=================================');
        
        try {
            // Fetch orderrows
            const orderrows = await this.fetchWithAuth('/external/orderrows', {
                deliveryStartDate: startDate,
                deliveryEndDate: endDate,
                slim: 1
            });
            
            console.log(`✅ Received ${orderrows.length} orderrows`);
            
            // Enrich each orderrow with customer/location/product data
            const enrichedOrders = orderrows.map(row => this.enrichOrderrow(row));
            
            // Show sample
            if (enrichedOrders.length > 0) {
                console.log('📋 SAMPLE ENRICHED ORDERROW:');
                console.log('   ', JSON.stringify(enrichedOrders[0], null, 2).substring(0, 800));
            }
            
            console.log('=================================');
            return enrichedOrders;
            
        } catch (error) {
            console.error('❌ Failed to fetch orderrows:', error);
            throw error;
        }
    }

    /**
     * Enrich orderrow with customer/location/product names
     * Following the manual exactly
     */
    enrichOrderrow(row) {
        // Get nested order data
        const order = row.order || {};
        
        // Get customer from map
        const customer = this.customerMap.get(order.customer_id);
        if (customer) {
            row.customer_name = customer.name;
            row.customer_code = customer.code;
            row.customer_address = customer.address;
            row.customer_city = customer.city;
            row.customer_postal_code = customer.postal_code;
        } else {
            row.customer_name = `Customer ${order.customer_id || 'Unknown'}`;
        }
        
        // Get delivery location from map
        const location = this.locationMap.get(order.delivery_location_id);
        if (location) {
            row.location_name = location.name;
            row.location_address = location.address;
            row.location_city = location.city;
            row.location_latitude = location.latitude;
            row.location_longitude = location.longitude;
        } else {
            row.location_name = `Location ${order.delivery_location_id || 'Unknown'}`;
        }
        
        // Get product from map
        const product = this.productMap.get(row.composite_product_id);
        if (product) {
            row.product_name = product.name;
            row.product_code = product.code;
            row.vbn_code = product.vbn_code;
            row.flower_color = product.color;
            row.flower_variety = product.variety;
            row.stem_length = product.stem_length;
        } else {
            row.product_name = `Product ${row.composite_product_id || 'Unknown'}`;
        }
        
        // Extract packaging properties
        const props = this.extractProperties(row);
        row.stems_per_bundle = props.stemsPerBundle;
        row.stems_per_container = props.stemsPerContainer;
        row.bundles_per_container = props.bundlesPerContainer;
        row.container_code = props.containerCode;
        row.quality_group = props.qualityGroup;
        row.country_of_origin = props.countryOfOrigin;
        
        // Calculate total stems (following manual priority)
        row.total_stems = this.calculateTotalStems(row, props);
        
        // Delivery info
        row.delivery_date = order.delivery_date;
        row.transport_date = order.transport_date;
        
        return row;
    }

    /**
     * Extract properties from orderrow.properties array
     * Property codes from VBN standard
     */
    extractProperties(row) {
        const props = {};
        
        for (const prop of row.properties || []) {
            const code = prop.code;
            const value = prop.pivot?.value;
            
            switch (code) {
                case 'L11': props.stemsPerBundle = parseInt(value, 10); break;
                case 'L13': props.stemsPerContainer = parseInt(value, 10); break;
                case 'L14': props.bundlesPerContainer = parseInt(value, 10); break;
                case 'S20': props.stemLength = parseInt(value, 10); break;
                case '901': props.containerCode = value; break;
                case 'S98': props.qualityGroup = value; break;
                case 'S62': props.countryOfOrigin = value; break;
            }
        }
        
        return props;
    }

    /**
     * Calculate total stems for an orderrow
     * Following manual priority order
     */
    calculateTotalStems(row, props) {
        // Priority 1: stems per bundle × assembly amount (bundles)
        if (props.stemsPerBundle && row.assembly_amount) {
            return props.stemsPerBundle * row.assembly_amount;
        }
        
        // Priority 2: nr_base_product (stems per container) × plates
        if (row.nr_base_product && row.amount_of_plates) {
            return parseInt(row.nr_base_product, 10) * row.amount_of_plates;
        }
        
        // Priority 3: stems per container × plates
        if (props.stemsPerContainer && row.amount_of_plates) {
            return props.stemsPerContainer * row.amount_of_plates;
        }
        
        // Fallback: assembly_amount (bundles)
        return row.assembly_amount || 0;
    }

    /**
     * Get orders for a specific date
     * @param {Date|string} deliveryDate - Date object or YYYY-MM-DD string
     */
    async getOrders(deliveryDate) {
        const dateStr = deliveryDate instanceof Date 
            ? deliveryDate.toISOString().split('T')[0]
            : deliveryDate;
        
        const florinetDate = this.toFlorinetDate(dateStr);
        console.log(`📅 Fetching orders for ${dateStr} (${florinetDate})`);
        
        return await this.getOrdersRange(florinetDate, florinetDate);
    }

    /**
     * Get today's orders
     */
    async getTodaysOrders() {
        const today = new Date();
        return await this.getOrders(today);
    }
}

// Global instance
const florinetAPI = new FlorinetAPI();

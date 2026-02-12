/**
 * Florinet API Client - REBUILT FROM MANUAL
 * Base URL: https://app.2growsoftware.com/api/v1
 * Following FLORINET_API_MANUAL.md exactly
 */

class FlorinetAPI {
    constructor() {
        // UNIVERSAL Environment Detection - Works on ANY server!
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isVercel = hostname.includes('vercel.app') || hostname.includes('vercel.com');
        
        // SMART ROUTING - Auto-detects the right API endpoint
        if (isLocalhost) {
            // Local development: try proxy on port 3001
            this.baseURL = 'http://localhost:3001/api';
            this.mode = 'LOCAL';
            console.log('🔧 LOCAL MODE - Using proxy: http://localhost:3001/api');
        } else if (isVercel) {
            // Vercel deployment: use serverless functions
            this.baseURL = '/api';
            this.mode = 'VERCEL';
            console.log('🌐 VERCEL MODE - Using serverless: /api');
        } else {
            // Any other server (dev231, etc): try relative /api path first
            this.baseURL = '/api';
            this.mode = 'PRODUCTION';
            console.log('🚀 PRODUCTION MODE - Using relative API: /api');
        }
        
        this.token = null;
        this.tokenExpiry = null;
        
        // Cached lookup maps
        this.customerMap = new Map();
        this.locationMap = new Map();
        this.productMap = new Map();
        
        console.log('✅ FlorinetAPI initialized');
        console.log(`   Hostname: ${hostname}`);
        console.log(`   Mode: ${this.mode}`);
        console.log(`   Base URL: ${this.baseURL}`);
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
            // Build auth URL - works on any server!
            const authUrl = this.mode === 'LOCAL'
                ? `${this.baseURL}/authenticate`
                : `${window.location.origin}${this.baseURL}/authenticate`;
            
            console.log('📤 Auth URL:', authUrl);
            console.log('📤 Mode:', this.mode);
            
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin' // Include cookies if needed
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Auth failed: HTTP ${response.status}`);
                console.error(`❌ Response: ${errorText}`);
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
            console.log(`   Token length: ${this.token.length} chars`);
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
        
        // Build URL - UNIVERSAL (works on ANY server!)
        const url = new URL(
            this.mode === 'LOCAL'
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
        console.log(`   Mode: ${this.mode}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });

        console.log(`📥 Response: ${response.status} ${response.statusText}`);

        // Handle token expiry
        if (response.status === 401) {
            console.log('⚠️ Token expired (401), re-authenticating...');
            await this.authenticate();
            
            console.log('🔄 Retrying request with new token...');
            // Retry with new token
            const retryResponse = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            console.log(`📥 Retry response: ${retryResponse.status} ${retryResponse.statusText}`);
            
            if (!retryResponse.ok) {
                const errorText = await retryResponse.text();
                console.error(`❌ Retry failed:`, errorText);
                throw new Error(`Retry failed: HTTP ${retryResponse.status} - ${errorText}`);
            }
            
            return retryResponse.json();
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API error:`, errorText);
            throw new Error(`API error: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Received ${Array.isArray(data) ? data.length : 'object'} items`);
        return data;
    }

    /**
     * Load all lookup data (customers, locations, products)
     * REQUIRED - Must work for proper customer/location names
     */
    async loadLookupData() {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  📋 LOADING CUSTOMERS & LOCATIONS (REQUIRED)              ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        
        // STEP 1: Ensure we have a valid token
        console.log('');
        console.log('STEP 1: Authentication');
        console.log('──────────────────────────────────────────────────────────');
        let token;
        try {
            token = await this.getToken();
            console.log('✅ Token acquired:', token.substring(0, 30) + '...');
        } catch (error) {
            console.error('❌ FAILED to get token:', error.message);
            console.error('   Cannot proceed without authentication!');
            throw error;
        }
        
        // STEP 2: Fetch customers
        console.log('');
        console.log('STEP 2: Fetching Customers');
        console.log('──────────────────────────────────────────────────────────');
        let customers = [];
        let customersFailed = false;
        try {
            console.log('📤 Calling: GET /external/customers');
            customers = await this.fetchWithAuth('/external/customers');
            
            if (!Array.isArray(customers)) {
                throw new Error('Response is not an array: ' + typeof customers);
            }
            
            console.log(`✅ SUCCESS: Fetched ${customers.length} customers`);
            
            if (customers.length > 0) {
                console.log('   Sample customer:', JSON.stringify(customers[0], null, 2).substring(0, 300));
            } else {
                console.warn('⚠️  API returned 0 customers - this might be wrong!');
            }
        } catch (error) {
            console.error('❌ FAILED to fetch customers:');
            console.error('   Error:', error.message);
            console.error('   This means customer names will show as IDs!');
            customersFailed = true;
        }
        
        // STEP 3: Fetch locations
        console.log('');
        console.log('STEP 3: Fetching Locations');
        console.log('──────────────────────────────────────────────────────────');
        let locations = [];
        let locationsFailed = false;
        try {
            console.log('📤 Calling: GET /external/locations');
            locations = await this.fetchWithAuth('/external/locations');
            
            if (!Array.isArray(locations)) {
                throw new Error('Response is not an array: ' + typeof locations);
            }
            
            console.log(`✅ SUCCESS: Fetched ${locations.length} locations`);
            
            if (locations.length > 0) {
                console.log('   Sample location:', JSON.stringify(locations[0], null, 2).substring(0, 300));
            } else {
                console.warn('⚠️  API returned 0 locations - this might be wrong!');
            }
        } catch (error) {
            console.error('❌ FAILED to fetch locations:');
            console.error('   Error:', error.message);
            console.error('   This means location names will show as IDs!');
            locationsFailed = true;
        }
        
        // STEP 4: Fetch products (optional, less critical)
        console.log('');
        console.log('STEP 4: Fetching Products (optional)');
        console.log('──────────────────────────────────────────────────────────');
        let products = [];
        try {
            console.log('📤 Calling: GET /external/compositeproducts');
            products = await this.fetchWithAuth('/external/compositeproducts');
            console.log(`✅ Fetched ${products.length} products`);
        } catch (error) {
            console.log('⚠️  Could not fetch products:', error.message);
            console.log('   (This is optional, using fallback)');
        }
        
        // STEP 5: Build lookup maps
        console.log('');
        console.log('STEP 5: Building Lookup Maps');
        console.log('──────────────────────────────────────────────────────────');
        
        // Customer map
        this.customerMap.clear();
        if (Array.isArray(customers) && customers.length > 0) {
            customers.forEach(customer => {
                if (customer && customer.id) {
                    this.customerMap.set(customer.id, customer);
                }
            });
            console.log(`✅ Customer map: ${this.customerMap.size} entries`);
            
            // Show first 3 mappings
            const firstThree = Array.from(this.customerMap.entries()).slice(0, 3);
            firstThree.forEach(([id, c]) => {
                console.log(`   ${id} → ${c.name || c.company_name || 'NO NAME'}`);
            });
        } else {
            console.error('❌ Customer map is EMPTY - names will not work!');
        }
        
        // Location map
        this.locationMap.clear();
        if (Array.isArray(locations) && locations.length > 0) {
            locations.forEach(location => {
                if (location && location.id) {
                    this.locationMap.set(location.id, location);
                }
            });
            console.log(`✅ Location map: ${this.locationMap.size} entries`);
            
            // Show first 3 mappings
            const firstThree = Array.from(this.locationMap.entries()).slice(0, 3);
            firstThree.forEach(([id, l]) => {
                console.log(`   ${id} → ${l.name || 'NO NAME'}`);
            });
        } else {
            console.error('❌ Location map is EMPTY - locations will not work!');
        }
        
        // Product map (optional)
        this.productMap.clear();
        if (Array.isArray(products) && products.length > 0) {
            products.forEach(product => {
                if (product && product.id) {
                    this.productMap.set(product.id, product);
                }
            });
            console.log(`✅ Product map: ${this.productMap.size} entries`);
        }
        
        // FINAL SUMMARY
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  📊 FINAL SUMMARY                                         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log(`Customers: ${this.customerMap.size} ${customersFailed ? '❌ FAILED' : '✅ OK'}`);
        console.log(`Locations: ${this.locationMap.size} ${locationsFailed ? '❌ FAILED' : '✅ OK'}`);
        console.log(`Products:  ${this.productMap.size}`);
        
        if (customersFailed || locationsFailed) {
            console.error('');
            console.error('⚠️⚠️⚠️  CRITICAL ISSUE  ⚠️⚠️⚠️');
            console.error('Customer or location fetch FAILED!');
            console.error('Orders will show IDs instead of names.');
            console.error('Check authentication and API access above.');
        }
        console.log('╚═══════════════════════════════════════════════════════════╝');
        
        return {
            customers: this.customerMap,
            locations: this.locationMap,
            products: this.productMap
        };
    }

    /**
     * Fetch ALL orderrows with pagination support
     * CRITICAL: API returns paginated data - this fetches ALL pages
     * @param {string} startDate - dd-mm-YYYY format
     * @param {string} endDate - dd-mm-YYYY format
     */
    async fetchAllOrderRowsPaginated(startDate, endDate) {
        const allRows = [];
        let page = 1;
        let hasMorePages = true;
        let lastPage = 1;
        const perPage = 500; // Standard pagination size

        console.log(`🔄 Fetching ALL pages for date range ${startDate} to ${endDate}...`);

        while (hasMorePages) {
            try {
                console.log(`   📄 Fetching page ${page}...`);
                
                const pageData = await this.fetchWithAuth('/external/orderrows', {
                    deliveryStartDate: startDate,
                    deliveryEndDate: endDate,
                    page: page,
                    per_page: perPage
                });

                let rows = [];

                // Handle different response formats
                if (Array.isArray(pageData)) {
                    // API returns plain array (no pagination metadata)
                    rows = pageData;
                    hasMorePages = rows.length === perPage; // If we got full page, might have more
                    if (rows.length < perPage) {
                        hasMorePages = false; // Last page
                    }
                    console.log(`   ✅ Page ${page}: ${rows.length} rows${hasMorePages ? ' (more pages expected)' : ' (last page)'}`);
                } else if (pageData && pageData.data && Array.isArray(pageData.data)) {
                    // API returns paginated object with metadata
                    rows = pageData.data;
                    lastPage = pageData.last_page || pageData.total_pages || 1;
                    const currentPage = pageData.current_page || page;
                    hasMorePages = currentPage < lastPage;
                    console.log(`   ✅ Page ${currentPage}/${lastPage}: ${rows.length} rows`);
                } else if (pageData && Array.isArray(pageData)) {
                    // Fallback: treat as array
                    rows = pageData;
                    hasMorePages = rows.length === perPage;
                    console.log(`   ✅ Page ${page}: ${rows.length} rows${hasMorePages ? ' (more pages expected)' : ' (last page)'}`);
                } else {
                    // Unexpected format
                    console.warn(`   ⚠️ Unexpected response format on page ${page}:`, typeof pageData);
                    rows = [];
                    hasMorePages = false;
                }

                if (rows.length === 0) {
                    // No more data
                    hasMorePages = false;
                } else {
                    allRows.push(...rows);
                    page++;
                }

                // Safety limit - never loop forever
                if (page > 100) {
                    console.warn(`   ⚠️ Safety limit reached at page 100 - stopping`);
                    break;
                }

            } catch (error) {
                console.error(`   ❌ Error on page ${page}:`, error.message);
                // If it's the first page and it fails, throw the error
                if (page === 1) {
                    throw error;
                }
                // Otherwise, stop pagination but return what we have
                console.warn(`   ⚠️ Stopping pagination due to error, returning ${allRows.length} rows fetched so far`);
                break;
            }
        }

        // Count unique orders
        const uniqueOrderIds = new Set();
        allRows.forEach(row => {
            const orderId = row.order_id || row.order?.id || row.order?.order_id || row.id;
            if (orderId) {
                uniqueOrderIds.add(String(orderId));
            }
        });

        console.log(`✅ Pagination complete:`);
        console.log(`   - Total pages fetched: ${page - 1}`);
        console.log(`   - Total orderrows: ${allRows.length}`);
        console.log(`   - Unique orders: ${uniqueOrderIds.size}`);
        console.log(`   - Average orderrows per order: ${uniqueOrderIds.size > 0 ? (allRows.length / uniqueOrderIds.size).toFixed(2) : 0}`);

        return allRows;
    }

    /**
     * Fetch orders for a date range
     * @param {string} startDate - dd-mm-YYYY format
     * @param {string} endDate - dd-mm-YYYY format
     */
    async getOrdersRange(startDate, endDate) {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  📦 FETCHING ORDERS WITH ENRICHMENT                       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log(`Date range: ${startDate} to ${endDate}`);
        console.log('');
        
        try {
            // STEP 1: Load lookup data FIRST (customers, locations, products)
            // This is CRITICAL - must happen before enrichment!
            if (this.customerMap.size === 0 || this.locationMap.size === 0) {
                console.log('⚠️ Lookup maps are empty - loading now...');
                await this.loadLookupData();
            } else {
                console.log('✅ Using cached lookup data:');
                console.log(`   - ${this.customerMap.size} customers`);
                console.log(`   - ${this.locationMap.size} locations`);
                console.log(`   - ${this.productMap.size} products`);
            }
            console.log('');
            
            // STEP 2: Fetch orderrows WITH PAGINATION
            // CRITICAL: API returns paginated data - must fetch ALL pages!
            console.log('📦 Fetching ALL orderrows from API (with pagination)...');
            const orderrows = await this.fetchAllOrderRowsPaginated(startDate, endDate);
            
            console.log(`✅ Received ${orderrows.length} total orderrows from API (all pages)`);
            
            // CRITICAL: Count unique orders (not orderrows!)
            // Multiple orderrows can belong to the same order
            const uniqueOrderIds = new Set();
            orderrows.forEach(row => {
                // Try multiple possible locations for order_id
                const orderId = row.order_id || 
                               row.order?.id || 
                               row.order?.order_id ||
                               row.id; // Sometimes order_id is at root level
                if (orderId) {
                    uniqueOrderIds.add(String(orderId)); // Convert to string for consistency
                }
            });
            
            console.log(`📊 API Statistics:`);
            console.log(`   - Total orderrows (product lines): ${orderrows.length}`);
            console.log(`   - Unique orders (by order_id): ${uniqueOrderIds.size}`);
            console.log(`   - Average orderrows per order: ${uniqueOrderIds.size > 0 ? (orderrows.length / uniqueOrderIds.size).toFixed(2) : 0}`);
            console.log('');
            
            // CRITICAL: Log sample order_ids for debugging
            if (orderrows.length > 0) {
                const sampleOrderIds = Array.from(uniqueOrderIds).slice(0, 5);
                console.log(`   Sample order_ids: ${sampleOrderIds.join(', ')}`);
                
                // Check first orderrow structure
                const firstRow = orderrows[0];
                console.log(`   First orderrow structure check:`);
                console.log(`     - row.order_id: ${firstRow.order_id || 'NOT FOUND'}`);
                console.log(`     - row.order?.id: ${firstRow.order?.id || 'NOT FOUND'}`);
                console.log(`     - row.order?.order_id: ${firstRow.order?.order_id || 'NOT FOUND'}`);
                console.log(`     - row.id: ${firstRow.id || 'NOT FOUND'}`);
            }
            console.log('');
            
            // STEP 3: Enrich each orderrow with customer/location/product data
            console.log('🔄 Enriching orderrows with customer/location names...');
            const enrichedOrders = orderrows.map(row => {
                const enriched = this.enrichOrderrow(row);
                // CRITICAL: Store order_id for unique counting
                enriched.order_id = row.order_id || row.order?.id || row.order?.order_id;
                return enriched;
            });
            
            // Count how many were successfully enriched
            const withCustomer = enrichedOrders.filter(o => !o.customer_name?.startsWith('customer ')).length;
            const withLocation = enrichedOrders.filter(o => !o.location_name?.startsWith('Location ')).length;
            
            console.log(`✅ Enrichment complete:`);
            console.log(`   - ${withCustomer}/${orderrows.length} orderrows have customer names`);
            console.log(`   - ${withLocation}/${orderrows.length} orderrows have location names`);
            
            if (withCustomer < orderrows.length || withLocation < orderrows.length) {
                console.warn('⚠️ Some orderrows missing enrichment data!');
                console.warn(`   Missing customers: ${orderrows.length - withCustomer}`);
                console.warn(`   Missing locations: ${orderrows.length - withLocation}`);
            }
            
            // CRITICAL: Count unique orders by order_id (not orderrows!)
            const uniqueOrdersByRoute = {
                rijnsburg: new Set(),
                aalsmeer: new Set(),
                naaldwijk: new Set()
            };
            
            enrichedOrders.forEach(orderrow => {
                const orderId = orderrow.order_id || orderrow.order?.id || orderrow.order?.order_id;
                const route = orderrow.route || 'rijnsburg';
                if (orderId) {
                    uniqueOrdersByRoute[route].add(orderId);
                }
            });
            
            const totalUniqueOrders = uniqueOrdersByRoute.rijnsburg.size + 
                                    uniqueOrdersByRoute.aalsmeer.size + 
                                    uniqueOrdersByRoute.naaldwijk.size;
            
            // ROUTE DISTRIBUTION ANALYSIS
            console.log('');
            console.log('═══════════════════════════════════════');
            console.log('📊 ROUTE DISTRIBUTION ANALYSIS (UNIQUE ORDERS)');
            console.log('═══════════════════════════════════════');
            console.log(`Total orderrows (product lines): ${enrichedOrders.length}`);
            console.log(`Total unique orders: ${totalUniqueOrders}`);
            console.log(`Rijnsburg: ${uniqueOrdersByRoute.rijnsburg.size} unique orders`);
            console.log(`Aalsmeer: ${uniqueOrdersByRoute.aalsmeer.size} unique orders`);
            console.log(`Naaldwijk: ${uniqueOrdersByRoute.naaldwijk.size} unique orders`);
            
            // Also count orderrows per route for reference
            const routeCounts = {
                rijnsburg: 0,
                aalsmeer: 0,
                naaldwijk: 0
            };
            
            const locationsByRoute = {
                rijnsburg: new Set(),
                aalsmeer: new Set(),
                naaldwijk: new Set()
            };
            
            enrichedOrders.forEach(order => {
                const route = order.route || 'rijnsburg';
                routeCounts[route]++;
                locationsByRoute[route].add(order.location_name);
            });
            
            console.log(`\nOrderrows per route (for reference):`);
            console.log(`Rijnsburg: ${routeCounts.rijnsburg} orderrows (${locationsByRoute.rijnsburg.size} locations)`);
            console.log(`Aalsmeer: ${routeCounts.aalsmeer} orderrows (${locationsByRoute.aalsmeer.size} locations)`);
            console.log(`Naaldwijk: ${routeCounts.naaldwijk} orderrows (${locationsByRoute.naaldwijk.size} locations)`);
            console.log('───────────────────────────────────────');
            
            // Show unique locations per route
            if (locationsByRoute.rijnsburg.size > 0) {
                console.log('Rijnsburg locations:', Array.from(locationsByRoute.rijnsburg).slice(0, 5).join(', ') + 
                    (locationsByRoute.rijnsburg.size > 5 ? ` ... (${locationsByRoute.rijnsburg.size} total)` : ''));
            }
            if (locationsByRoute.aalsmeer.size > 0) {
                console.log('Aalsmeer locations:', Array.from(locationsByRoute.aalsmeer).slice(0, 5).join(', ') + 
                    (locationsByRoute.aalsmeer.size > 5 ? ` ... (${locationsByRoute.aalsmeer.size} total)` : ''));
            }
            if (locationsByRoute.naaldwijk.size > 0) {
                console.log('Naaldwijk locations:', Array.from(locationsByRoute.naaldwijk).slice(0, 5).join(', ') + 
                    (locationsByRoute.naaldwijk.size > 5 ? ` ... (${locationsByRoute.naaldwijk.size} total)` : ''));
            }
            console.log('═══════════════════════════════════════');
            
            // Show sample
            if (enrichedOrders.length > 0) {
                console.log('');
                console.log('📋 Sample enriched order:');
                const sample = enrichedOrders[0];
                console.log(`   Customer: ${sample.customer_name}`);
                console.log(`   Location: ${sample.location_name}`);
                console.log(`   Route: ${sample.route}`);
                console.log(`   Product: ${sample.product_name}`);
                console.log(`   Quantity: ${sample.total_stems}`);
            }
            
            // Store unique order count for reference
            enrichedOrders._uniqueOrderCount = totalUniqueOrders;
            enrichedOrders._totalOrderrows = enrichedOrders.length;
            
            console.log('');
            console.log('╚═══════════════════════════════════════════════════════════╝');
            console.log(`📊 SUMMARY: ${totalUniqueOrders} unique orders from ${enrichedOrders.length} orderrows`);
            return enrichedOrders;
            
        } catch (error) {
            console.error('❌ Failed to fetch/enrich orderrows:', error);
            throw error;
        }
    }

    /**
     * Map location to route using delivery_location_id (CORRECT METHOD from feedback report)
     * 
     * CRITICAL FIX: Use delivery_location_id, not location name!
     * According to the feedback report:
     *   - delivery_location_id = 32 → Aalsmeer
     *   - delivery_location_id = 34 → Naaldwijk
     *   - delivery_location_id = 36 → Rijnsburg
     */
    mapLocationToRoute(locationName, deliveryLocationId) {
        // PRIORITY 1: Use delivery_location_id (most reliable)
        if (deliveryLocationId) {
            switch(deliveryLocationId) {
                case 32: return 'aalsmeer';
                case 34: return 'naaldwijk';
                case 36: return 'rijnsburg';
            }
        }
        
        // FALLBACK: Use location name (less reliable, but better than nothing)
        if (!locationName) return 'rijnsburg'; // Default
        
        const location = locationName.toLowerCase();
        
        // Route 2: Aalsmeer
        if (location.includes('aalsmeer') || 
            location.includes('alsmeer')) {
            return 'aalsmeer';
        }
        
        // Route 3: Naaldwijk
        if (location.includes('naaldwijk') || 
            location.includes('nldwijk') ||
            location.includes('zuidplas') ||
            location.includes('kwekerij') ||
            location.includes('klondike')) {
            return 'naaldwijk';
        }
        
        // Route 1: Rijnsburg (default for everything else)
        return 'rijnsburg';
    }
    
    /**
     * Enrich orderrow with customer/location/product names from lookup maps
     * MUST have loaded lookup data first via loadLookupData()
     */
    enrichOrderrow(row) {
        // Get nested order data
        const order = row.order || {};
        
        // GET CUSTOMER from map (REQUIRED)
        const customer = this.customerMap.get(order.customer_id);
        if (customer) {
            row.customer_name = customer.name || customer.company_name || `Customer ${order.customer_id}`;
            row.customer_code = customer.code;
            row.customer_address = customer.address;
            row.customer_city = customer.city;
            row.customer_postal_code = customer.postal_code;
        } else {
            // NO FALLBACK - show ID so it's obvious something is wrong
            row.customer_name = `customer ${order.customer_id}`;
            console.warn(`⚠️ Customer ${order.customer_id} not found in map!`);
        }
        
        // GET LOCATION from map (REQUIRED)
        const location = this.locationMap.get(order.delivery_location_id);
        if (location) {
            row.location_name = location.name;
            row.location_address = location.address;
            row.location_city = location.city;
            row.location_latitude = location.latitude;
            row.location_longitude = location.longitude;
        } else {
            // NO FALLBACK - show ID so it's obvious something is wrong
            row.location_name = `Location ${order.delivery_location_id}`;
            console.warn(`⚠️ Location ${order.delivery_location_id} not found in map!`);
        }
        
        // GET PRODUCT from map (optional)
        const product = this.productMap.get(row.composite_product_id);
        if (product) {
            row.product_name = product.name;
            row.product_code = product.code;
            row.vbn_code = product.vbn_code;
            row.flower_color = product.color;
            row.flower_variety = product.variety;
            row.stem_length = product.stem_length;
        } else {
            row.product_name = `Product ${row.composite_product_id}`;
        }
        
        // MAP LOCATION TO ROUTE (use delivery_location_id for accuracy!)
        row.route = this.mapLocationToRoute(row.location_name, order.delivery_location_id);
        
        // Extract packaging properties
        const props = this.extractProperties(row);
        row.stems_per_bundle = props.stemsPerBundle;
        row.stems_per_container = props.stemsPerContainer;
        row.bundles_per_fust = props.bundlesPerFust; // CRITICAL: bundles per FUST (not bundles per cart!)
        row.bundles_per_container = props.bundlesPerFust; // Alias for backwards compatibility
        row.fust_code = props.fustCode; // CRITICAL: Fust type code (612, 575, 902, etc)
        row.container_code = props.containerCode;
        row.quality_group = props.qualityGroup;
        row.country_of_origin = props.countryOfOrigin;
        
        // Calculate total FUST (containers), NOT stems!
        // This is the critical fix from the feedback report
        row.fust_count = this.calculateFustCount(row, props);
        
        // Also calculate total stems for display/reference (but DON'T use for cart calculation!)
        row.total_stems = this.calculateTotalStems(row, props);
        
        // Delivery info
        row.delivery_date = order.delivery_date;
        row.transport_date = order.transport_date;
        row.delivery_location_id = order.delivery_location_id; // CRITICAL for route detection!
        row.customer_id = order.customer_id; // For reference
        
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
                case 'L14': props.bundlesPerFust = parseInt(value, 10); break; // CRITICAL: bundles per FUST (container)
                case 'S20': props.stemLength = parseInt(value, 10); break;
                case '901': 
                    props.fustCode = value; // CRITICAL: Fust type code (612, 575, 902, etc)
                    props.containerCode = value; // Keep for backwards compatibility
                    break;
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
     * Calculate FUST COUNT (containers) - THE CORRECT WAY
     * 
     * CRITICAL FIX based on feedback report:
     * We transport FUST (containers), not individual stems!
     * 
     * Formula: fust_count = assembly_amount ÷ bundles_per_fust
     * 
     * Example:
     *   - assembly_amount = 4 bunches
     *   - bundles_per_fust = 5 bunches per container
     *   - fust_count = 4 ÷ 5 = 0.8 containers
     * 
     * Then cart calculation uses: carts = fust_count ÷ capacity_per_fust_type
     */
    calculateFustCount(row, props) {
        // Priority 1: assembly_amount ÷ bundles_per_fust (from L14 property)
        if (row.assembly_amount && props.bundlesPerFust && props.bundlesPerFust > 0) {
            return row.assembly_amount / props.bundlesPerFust;
        }
        
        // Priority 2: amount_of_transport_carriers (this is already in fust units!)
        // Note: This is a FRACTION (e.g., 0.25 = quarter cart), not fust count
        // We need to convert it to fust based on the fust type capacity
        if (row.amount_of_transport_carriers) {
            // amount_of_transport_carriers is fraction of CART, not fust
            // Need to multiply by cart capacity to get fust count
            const fustCode = props.fustCode || row.container_code || '612';
            const fustCapacity = this.getFustCapacity(fustCode);
            return row.amount_of_transport_carriers * fustCapacity;
        }
        
        // Priority 3: amount_of_plates (plates are containers)
        if (row.amount_of_plates) {
            return row.amount_of_plates;
        }
        
        // Fallback: Assume assembly_amount is in fust units (not ideal, but better than nothing)
        return row.assembly_amount || 0;
    }

    /**
     * Get fust capacity (how many fust fit in one cart)
     * Based on fust type code from property '901'
     * 
     * From business requirements document:
     */
    getFustCapacity(fustCode) {
        const FUST_CAPACITIES = {
            '612': 72,  // Gerbera box 12cm: 3 layers of 24
            '614': 72,  // Gerbera mini box: same as 612
            '575': 32,  // Charge code Fc566: Extra layer: 16×612 or 10×902
            '902': 40,  // Charge code Fc588: 4 layers of 10
            '588': 40,  // Medium container: Clock trade only
            '996': 32,  // Small container + small rack: Extra: 10×902 or 12×612
            '856': 20,  // Charge code €6.00
            '821': 40   // Default to 40 if unknown
        };
        
        return FUST_CAPACITIES[fustCode] || 72; // Default to 72 if unknown
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
     * Alias for getOrders - for backward compatibility
     * @param {Date|string} deliveryDate - Date object or YYYY-MM-DD string
     */
    async fetchOrdersForDate(deliveryDate) {
        return await this.getOrders(deliveryDate);
    }
    
    /**
     * Alias for getOrders - for backward compatibility
     * @param {Date|string} date - Date object or YYYY-MM-DD string
     */
    async getOrdersForDate(date) {
        return await this.getOrders(date);
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

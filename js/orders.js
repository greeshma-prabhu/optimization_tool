/**
 * Zuidplas Logistics - Order Processing
 * Handles order fetching, processing, and display
 */

class OrderManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentDate = new Date();
        this.api = florinetAPI;
        
        // Fust capacities (from business requirements)
        this.FUST_CAPACITIES = {
            '612': 72,  // Gerbera box 12cm: 3 layers of 24
            '614': 72,  // Gerbera mini box: same as 612
            '575': 32,  // Charge code Fc566
            '902': 40,  // Charge code Fc588: 4 layers of 10
            '588': 40,  // Medium container
            '996': 32,  // Small container + small rack
            '856': 20,  // Charge code €6.00
            '821': 40   // Default
        };
        
        // Dynamic mappings (fetched from API, NOT hardcoded!)
        this.locationMap = new Map(); // location_id → location name
        this.companyMap = new Map();  // company_id → company name
        this.contractsMap = new Map(); // contract_id → customer details
        
        // Try to load orders from localStorage on initialization
        this.loadOrdersFromStorage();
        
        // Fetch reference data on initialization
        this.initializeReferenceMaps();
    }
    
    /**
     * Get fust capacity for a given fust code
     * Helper method for cart calculation
     */
    getFustCapacityForCode(fustCode) {
        return this.FUST_CAPACITIES[fustCode] || 72; // Default to 72 if unknown
    }
    
    /**
     * Fetch all reference data from API (customers, locations, products)
     * This MUST be called before processing orders!
     */
    async initializeReferenceMaps() {
        console.log('🔄 Initializing reference data...');
        
        try {
            // Load lookup data from API (customers, locations, products)
            const { customers, locations, products } = await this.api.loadLookupData();
            
            // Store maps for easy access
            this.locationMap = locations;
            this.companyMap = customers;
            this.productMap = products;
            
            console.log('✅ Reference data loaded:');
            console.log(`   - ${this.companyMap.size} customers`);
            console.log(`   - ${this.locationMap.size} locations`);
            console.log(`   - ${this.productMap.size} products`);
            
        } catch (error) {
            console.error('❌ Failed to load reference data:', error);
            console.warn('⚠️  Orders may not show customer/location names correctly');
        }
    }
    
    /**
     * Fetch locations from Florinet API
     * NOTE: /external/locations endpoint doesn't exist - skipping
     */
    async fetchLocations() {
        console.log('ℹ️  Skipping locations API (endpoint not available)');
        // Locations will be determined from business rules instead
    }
    
    /**
     * Fetch contracts from Florinet API (contains company/customer data)
     * NOTE: /external/contracts endpoint doesn't exist - skipping
     */
    async fetchContracts() {
        console.log('ℹ️  Skipping contracts API (endpoint not available)');
        // Customer names are directly in orderrows.customer_reference field
    }

    /**
     * Load orders from localStorage (for cross-page access)
     */
    loadOrdersFromStorage() {
        try {
            const storedOrders = localStorage.getItem('zuidplas_orders');
            const timestamp = localStorage.getItem('zuidplas_orders_timestamp');
            const ordersLoaded = localStorage.getItem('zuidplas_orders_loaded') === 'true';
            
            // Only use stored orders if they were explicitly loaded (not just cached)
            // AND they're less than 24 hours old
            if (storedOrders && timestamp && ordersLoaded) {
                const age = Date.now() - parseInt(timestamp);
                if (age < 24 * 60 * 60 * 1000) { // 24 hours
                    this.orders = JSON.parse(storedOrders);
                    this.filteredOrders = [...this.orders];
                    console.log('📦 Loaded orders from storage:', this.orders.length);
                    return true;
                } else {
                    // Clear old data
                    localStorage.removeItem('zuidplas_orders');
                    localStorage.removeItem('zuidplas_orders_timestamp');
                    localStorage.removeItem('zuidplas_orders_loaded');
                }
            } else if (storedOrders && !ordersLoaded) {
                // Orders exist but weren't explicitly loaded - clear them
                console.log('⚠️ Found cached orders but they were not explicitly loaded. Clearing...');
                localStorage.removeItem('zuidplas_orders');
                localStorage.removeItem('zuidplas_orders_timestamp');
                localStorage.removeItem('zuidplas_orders_loaded');
            }
        } catch (e) {
            console.warn('Could not load orders from localStorage:', e);
        }
        return false;
    }

    /**
     * Get dummy orders for testing/demo
     */
    getDummyOrders() {
        console.log('📦 Using dummy order data for demonstration');
        // DUMMY_ORDERS is defined in data.js, accessible globally
        if (typeof DUMMY_ORDERS !== 'undefined') {
            return DUMMY_ORDERS.map(order => ({ ...order })); // Return copy
        }
        console.error('DUMMY_ORDERS not found - make sure data.js is loaded');
        return [];
    }

    /**
     * Fetch orders from API (or use dummy data)
     */
    async fetchOrders(date = null, useDummy = false) {
        // Use dummy data if requested or if API fails
        if (useDummy) {
            console.log('📦 Using dummy data for demonstration');
            const dummyOrders = this.getDummyOrders();
            this.orders = this.processOrders(dummyOrders);
            this.filteredOrders = [...this.orders];
            this.updateOrderCount();
            this.displayOrders();
            this.showInfo('✅ Using dummy order data for demonstration. All features are working!');
            
            // Store in localStorage for cross-page access
            // Compress if too many orders to avoid quota exceeded
            try {
                if (this.orders.length > 500) {
                    // Store only essential fields for large datasets
                    const compressed = this.orders.slice(0, 500).map(o => ({
                        id: o.id,
                        customer: o.customer,
                        deliveryLocation: o.deliveryLocation,
                        quantity: o.quantity,
                        cartType: o.cartType,
                        cartsNeeded: o.cartsNeeded
                    }));
                    localStorage.setItem('zuidplas_orders', JSON.stringify(compressed));
                    console.log(`⚠️ Stored ${compressed.length} compressed orders (out of ${this.orders.length} total)`);
                } else {
                    localStorage.setItem('zuidplas_orders', JSON.stringify(this.orders));
                }
                localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                localStorage.setItem('zuidplas_using_demo_data', 'true');
                localStorage.setItem('zuidplas_orders_loaded', 'true'); // Flag: orders were explicitly loaded
                
                // CRITICAL: Clear previous truck assignments when new data is loaded
                // User must select trucks fresh each time
                localStorage.removeItem('zuidplas_route_truck_assignments');
                console.log('🔄 Cleared previous truck assignments - user must select fresh');
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded, storing summary only');
                    try {
                        localStorage.setItem('zuidplas_orders_count', this.orders.length.toString());
                        localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                        localStorage.setItem('zuidplas_orders_loaded', 'true');
                    } catch (e2) {
                        console.error('❌ Could not store even summary:', e2);
                    }
                } else {
                    console.warn('Could not save orders to localStorage:', e);
                }
            }
            
            return this.orders;
        }

        try {
            const targetDate = date || this.currentDate;
            console.log('Fetching orders for date:', targetDate);
            
            const orders = await this.api.getOrders(targetDate);
            console.log('Received orders data:', orders);
            
            // Process orders
            this.orders = this.processOrders(orders);
            this.filteredOrders = [...this.orders];
            
            // Update UI
            this.updateOrderCount();
            this.displayOrders();
            
            // Store in localStorage for cross-page access
            // Use compressed storage if too many orders to avoid quota exceeded
            try {
                if (this.orders.length > 500) {
                    // Store only essential fields for large datasets
                    const compressed = this.orders.slice(0, 500).map(o => ({
                        id: o.id,
                        customer: o.customer,
                        deliveryLocation: o.deliveryLocation,
                        quantity: o.quantity,
                        cartType: o.cartType,
                        cartsNeeded: o.cartsNeeded
                    }));
                    localStorage.setItem('zuidplas_orders', JSON.stringify(compressed));
                    console.log(`⚠️ Stored ${compressed.length} compressed orders (out of ${this.orders.length} total)`);
                } else {
                    localStorage.setItem('zuidplas_orders', JSON.stringify(this.orders));
                }
                localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                localStorage.setItem('zuidplas_using_demo_data', 'false');
                localStorage.setItem('zuidplas_orders_loaded', 'true'); // Flag: orders were explicitly loaded
                
                // CRITICAL: Clear previous truck assignments when new data is loaded
                // User must select trucks fresh each time
                localStorage.removeItem('zuidplas_route_truck_assignments');
                console.log('🔄 Cleared previous truck assignments - user must select fresh');
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded, storing summary only');
                    try {
                        localStorage.setItem('zuidplas_orders_count', this.orders.length.toString());
                        localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                        localStorage.setItem('zuidplas_orders_loaded', 'true');
                    } catch (e2) {
                        console.error('❌ Could not store even summary:', e2);
                    }
                } else {
                    console.warn('Could not save orders to localStorage:', e);
                }
            }
            
            // Show message if no orders (but don't fallback - empty is valid)
            if (this.orders.length === 0) {
                const dateStr = targetDate instanceof Date 
                    ? targetDate.toLocaleDateString() 
                    : targetDate;
                this.showInfo(`No orders found for ${dateStr}. This is normal if there are no orders for that date.`);
            }
            
            return this.orders;
        } catch (error) {
            console.error('=================================');
            console.error('❌ ERROR FETCHING ORDERS');
            console.error('Error:', error);
            console.error('=================================');
            this.showError(`Failed to fetch orders from API: ${error.message}`);
            throw error; // Throw error instead of falling back
        }
    }
    
    /**
     * Show info message
     */
    showInfo(message) {
        const infoDiv = document.getElementById('info-message');
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.className = 'info-box info';
            infoDiv.style.display = 'block';
            setTimeout(() => {
                infoDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Process raw API orders
     */
    processOrders(rawOrders) {
        // Handle empty or null responses
        if (!rawOrders) {
            console.log('No orders data received');
            return [];
        }
        
        if (!Array.isArray(rawOrders)) {
            console.log('Orders data is not an array:', typeof rawOrders);
            // If it's an object with an error, log it
            if (rawOrders.error) {
                console.error('API returned error:', rawOrders);
                this.showError(rawOrders.error + (rawOrders.details ? ': ' + rawOrders.details : ''));
            }
            return [];
        }

        console.log(`🔍 PROCESSING ${rawOrders.length} ORDERROWS (RAW DATA)`);
        console.log('=================================');
        
        // CRITICAL FIX: Group orderrows by order_id
        // Each order has multiple rows (line items), we need to group them!
        const orderGroupsMap = new Map();
        
        rawOrders.forEach((row, index) => {
            // Get order_id - try multiple possible fields
            const orderId = row.order_id || row.orderId || row.id || `order_${index}`;
            
            if (!orderGroupsMap.has(orderId)) {
                orderGroupsMap.set(orderId, []);
            }
            orderGroupsMap.get(orderId).push(row);
        });
        
        console.log(`✅ GROUPED INTO ${orderGroupsMap.size} UNIQUE ORDERS`);
        console.log(`   (was ${rawOrders.length} orderrows, reduced duplicates)`);
        console.log('=================================');
        
        // Now process each GROUP as one order
        const processedOrders = [];
        let processedCount = 0;

        for (const [orderId, orderRows] of orderGroupsMap) {
            processedCount++;
            
            // Use first row as base (has customer, location, etc.)
            const baseRow = orderRows[0];
            
            // Sum quantities across all rows for this order
            let totalQuantity = 0;
            const productCodes = [];
            
            orderRows.forEach((row, rowIdx) => {
                // CRITICAL FIX: Use fust_count (containers), NOT total_stems!
                // According to feedback report, we transport FUST (containers), not stems
                let rowQty = row.fust_count || 0;
                let qtySource = 'fust_count (containers)';
                
                // FALLBACK 1: If fust_count is 0 or missing, calculate from assembly_amount
                if (rowQty === 0 && row.assembly_amount && row.bundles_per_fust) {
                    rowQty = row.assembly_amount / row.bundles_per_fust;
                    qtySource = 'assembly_amount ÷ bundles_per_fust';
                }
                
                // FALLBACK 2: amount_of_plates (plates are containers)
                if (rowQty === 0 && row.amount_of_plates) {
                    rowQty = row.amount_of_plates;
                    qtySource = 'amount_of_plates';
                }
                
                // FALLBACK 3: amount_of_transport_carriers (fraction of cart)
                if (rowQty === 0 && row.amount_of_transport_carriers) {
                    // Need to convert fraction to fust count
                    const fustCode = row.fust_code || row.container_code || '612';
                    const fustCapacity = this.getFustCapacityForCode(fustCode);
                    rowQty = row.amount_of_transport_carriers * fustCapacity;
                    qtySource = 'amount_of_transport_carriers × capacity';
                }
                
                // LAST RESORT: assembly_amount (assume it's in fust units)
                if (rowQty === 0) {
                    rowQty = row.assembly_amount || 0;
                    qtySource = 'assembly_amount (fallback)';
                }
                
                // Log quantity extraction for first order
                if (processedCount === 1 && rowIdx === 0) {
                    console.log('   🔢 QUANTITY EXTRACTION (FUST COUNT):');
                    console.log('      fust_count (from API):', row.fust_count);
                    console.log('      assembly_amount:', row.assembly_amount);
                    console.log('      bundles_per_fust:', row.bundles_per_fust);
                    console.log('      amount_of_plates:', row.amount_of_plates);
                    console.log('      amount_of_transport_carriers:', row.amount_of_transport_carriers);
                    console.log('      fust_code:', row.fust_code || row.container_code);
                    console.log(`      → Using: ${qtySource} = ${rowQty.toFixed(2)} fust`);
                }
                
                totalQuantity += rowQty;
                
                // Collect product codes
                const productCode = row.composite_product_id || row.product_code || row.productCode || '';
                if (productCode && !productCodes.includes(productCode)) {
                    productCodes.push(productCode);
                }
            });
            
            // Log first 3 order groups to debug field names
            if (processedCount <= 3 && orderRows.length > 0) {
                console.log(`\n📋 ORDER ${processedCount}: ${orderId}`);
                console.log(`   Rows in group: ${orderRows.length}`);
                console.log(`   Total quantity: ${totalQuantity}`);
                console.log('\n   🔍 RAW DATA INSPECTION:');
                console.log('   =======================');
                
                // Show COMPLETE first row to see ALL fields
                console.log('   COMPLETE baseRow object:', JSON.stringify(baseRow, null, 2));
                
                console.log('\n   📝 CRITICAL FIELDS:');
                console.log('      customer_reference:', baseRow.customer_reference);
                console.log('      customer:', baseRow.customer);
                console.log('      customer_name:', baseRow.customer_name);
                console.log('      customer_code:', baseRow.customer_code);
                console.log('      company_id:', baseRow.company_id, '← KEY for customer lookup!');
                console.log('      label_info:', baseRow.label_info);
                console.log('      external_id:', baseRow.external_id);
                console.log('      delivery_location_id (base):', baseRow.delivery_location_id);
                console.log('      delivery_location_id (order):', baseRow.order?.delivery_location_id, '← KEY!');
                console.log('      location_description:', baseRow.location_description);
                console.log('      location:', baseRow.location);
                console.log('      location_name:', baseRow.location_name);
                console.log('      location_id:', baseRow.location_id);
                console.log('      link_location_id:', baseRow.link_location_id);
                console.log('      delivery_location:', baseRow.delivery_location);
                console.log('\n   📦 ORDER OBJECT:');
                if (baseRow.order) {
                    console.log('      order exists:', JSON.stringify(baseRow.order, null, 2));
                } else {
                    console.log('      order: null/undefined');
                }
                console.log('\n   ALL AVAILABLE FIELDS:', Object.keys(baseRow).join(', '));
                console.log('=================================\n');
            }
            
            // Extract customer - API has already enriched this data!
            // The baseRow.customer_name was set by api.js enrichOrderrow() method
            let customerName = baseRow.customer_name || `Customer ${baseRow.order?.customer_id || 'Unknown'}`;
            
            if (processedCount <= 3) {
                console.log(`   ✅ Customer: "${customerName}"`);
            }
            
            // Extract location - API has already enriched this data!
            // The baseRow.location_name was set by api.js enrichOrderrow() method
            let location = baseRow.location_name || baseRow.location_city || `Location ${baseRow.order?.delivery_location_id || 'Unknown'}`;
            
            if (processedCount <= 3) {
                console.log(`   ✅ Location: "${location}"`);
            }
            
            // Extract delivery date
            let deliveryDate = null;
            if (baseRow.order?.delivery_date) {
                deliveryDate = new Date(baseRow.order.delivery_date);
            } else if (baseRow.delivery_date) {
                deliveryDate = new Date(baseRow.delivery_date);
            } else if (baseRow.order?.deliveryDate) {
                deliveryDate = new Date(baseRow.order.deliveryDate);
            } else if (baseRow.deliveryDate) {
                deliveryDate = new Date(baseRow.deliveryDate);
            }
            
            // Determine route based on location
            const route = this.getRouteFromLocation(location);
            
            // If location is empty/unknown, use route name as location
            if (!location || location === 'Unknown') {
                // Map route to proper location name
                const routeLocationMap = {
                    'rijnsburg': 'Rijnsburg',
                    'aalsmeer': 'Aalsmeer',
                    'naaldwijk': 'Naaldwijk'
                };
                location = routeLocationMap[route] || 'Rijnsburg'; // Default to Rijnsburg
                
                if (processedCount <= 3) {
                    console.log(`   ℹ️  No location found, using route as location: ${location}`);
                }
            }
            
            // Determine cart type and calculate carts needed
            const cartType = this.getCartType(productCodes[0] || '', location);
            const cartsNeeded = this.calculateCartsNeeded(totalQuantity, cartType);
            
            // Create processed order
            const processedOrder = {
                id: orderId,
                customer: customerName,
                deliveryLocation: location,
                deliveryDate: deliveryDate,
                quantity: totalQuantity,
                productCode: productCodes.join(', '),
                productCodes: productCodes,
                route: route,
                cartType: cartType,
                cartsNeeded: cartsNeeded,
                status: baseRow.status || 'In Afwachting',
                numberOfRows: orderRows.length, // Track how many rows were grouped
                _rawRows: orderRows // Keep raw data for debugging
            };
            
            processedOrders.push(processedOrder);
        }
        
        console.log('=================================');
        console.log(`✅ PROCESSED ${processedOrders.length} UNIQUE ORDERS`);
        console.log(`   Total carts needed: ${processedOrders.reduce((sum, o) => sum + o.cartsNeeded, 0)}`);
        console.log('=================================');
        
        // Collect unique IDs found for mapping purposes
        const companyIds = new Set();
        const deliveryLocationIds = new Set();
        rawOrders.forEach(row => {
            if (row.company_id) companyIds.add(row.company_id);
            if (row.delivery_location_id) deliveryLocationIds.add(row.delivery_location_id);
        });
        
        if (companyIds.size > 0 || deliveryLocationIds.size > 0) {
            console.log('\n🔍 UNIQUE IDS FOUND (for mapping):');
            if (companyIds.size > 0) {
                console.log(`   company_id values: ${Array.from(companyIds).sort((a,b) => a-b).join(', ')}`);
                console.log('   → Need to fetch /external/contracts to map these to customer names');
            }
            if (deliveryLocationIds.size > 0) {
                console.log(`   delivery_location_id values: ${Array.from(deliveryLocationIds).sort((a,b) => a-b).join(', ')}`);
                console.log('   → Need to map these to actual locations (Rijnsburg, Aalsmeer, Naaldwijk)');
            }
            console.log('=================================\n');
        }
        
        if (processedOrders.length > 0) {
            console.log('📋 FIRST 3 PROCESSED ORDERS:');
            processedOrders.slice(0, 3).forEach((order, idx) => {
                console.log(`${idx + 1}.`, {
                    customer: order.customer,
                    location: order.deliveryLocation,
                    route: order.route,
                    qty: order.quantity,
                    carts: order.cartsNeeded,
                    rows: order.numberOfRows
                });
            });
            console.log('=================================');
        }
        
        return processedOrders;
    }


    /**
     * Extract crate type from product code or name
     */
    extractCrateType(order) {
        // Check various product fields for crate type
        const product = order.productCode || order.product_code || order.composite_product_id || '';
        const productStr = product.toString().trim();
        
        // Common crate types: 612, 575, 902, 588, 996, 856
        if (productStr.match(/612|FCC/i)) return '612';
        if (productStr.match(/575|Bloemenkar|bloem/i)) return '575';
        if (productStr.match(/902|Hangplant|hang/i)) return '902';
        if (productStr.match(/588|Dendro/i)) return '588';
        if (productStr.match(/996/i)) return '996';
        if (productStr.match(/856/i)) return '856';
        
        return '612'; // Default to most common type
    }
    
    /**
     * Determine route from delivery location
     */
    getRouteFromLocation(location) {
        if (!location) return 'rijnsburg'; // Default route
        
        const locationLower = location.toLowerCase().trim();
        
        // Route 1: Rijnsburg
        if (locationLower.includes('rijnsburg') || locationLower.includes('rjnsburg')) {
            return 'rijnsburg';
        }
        
        // Route 2: Aalsmeer
        if (locationLower.includes('aalsmeer') || locationLower.includes('alsmeer')) {
            return 'aalsmeer';
        }
        
        // Route 3: Naaldwijk
        if (locationLower.includes('naaldwijk') || locationLower.includes('nldwijk')) {
            return 'naaldwijk';
        }
        
        // Default to Rijnsburg (most common)
        return 'rijnsburg';
    }
    
    /**
     * Determine cart type (Danish or Standard) based on customer
     */
    getCartType(productCode, location) {
        // Danish cart customers - these are specific customers that require Danish carts
        // (we don't have customer name at this point, so we'll use default 'standard')
        // This will be refined by CartManager.assignCartType() later
        return 'standard';
    }
    
    /**
     * Calculate carts needed based on quantity and cart type
     */
    calculateCartsNeeded(quantity, cartType) {
        // Standard capacities by crate type
        const capacities = {
            standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
            danish: 17
        };
        
        // For now, assume default crate type '612' (most common)
        const capacity = cartType === 'danish' ? 17 : 72;
        
        // Calculate carts needed (round up)
        const cartsNeeded = Math.ceil(quantity / capacity);
        
        return cartsNeeded;
    }

    /**
     * Extract crate type from product code or name
     */
    extractCrateType(order) {
        const code = (order.productCode || '').toString();
        const name = (order.productName || order.productType || '').toString();
        
        // Check for crate type in code or name
        const crateTypes = ['612', '575', '902', '588', '996', '856'];
        for (const type of crateTypes) {
            if (code.includes(type) || name.includes(type)) {
                return type;
            }
        }
        
        return '612'; // Default
    }

    /**
     * Filter orders
     */
    filterOrders(filters) {
        this.filteredOrders = this.orders.filter(order => {
            if (filters.route && order.deliveryLocation) {
                const routeMatch = order.deliveryLocation.toLowerCase().includes(filters.route.toLowerCase());
                if (!routeMatch) return false;
            }
            
            if (filters.cartType && order.cartType !== filters.cartType) {
                return false;
            }
            
            if (filters.customer && order.customer) {
                const customerMatch = order.customer.toLowerCase().includes(filters.customer.toLowerCase());
                if (!customerMatch) return false;
            }
            
            if (filters.status && order.status !== filters.status) {
                return false;
            }
            
            return true;
        });
        
        this.displayOrders();
    }

    /**
     * Search orders
     */
    searchOrders(query) {
        if (!query) {
            this.filteredOrders = [...this.orders];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredOrders = this.orders.filter(order => {
                return (
                    (order.customer && order.customer.toLowerCase().includes(lowerQuery)) ||
                    (order.orderId && order.orderId.toString().includes(lowerQuery)) ||
                    (order.productType && order.productType.toLowerCase().includes(lowerQuery))
                );
            });
        }
        
        this.displayOrders();
    }

    /**
     * Assign carts to all orders
     * DISABLED - Using new cart-calculation.js instead
     */
    assignCarts() {
        console.log('ℹ️ assignCarts() is DISABLED - using cart-calculation.js instead');
        return; // DO NOTHING - new calculation happens in dashboard
    }
    
    /* ORPHANED CODE REMOVED - This was causing syntax errors
        console.log('🔧 Assigning carts to', this.orders.length, 'orders...');
        console.log('📊 Grouping by customer first (same customer = same cart group)...');
        
        // First, assign cart types to all orders
        // Ensure cartManager is available (check multiple sources)
        let cm = null;
        
        // Try multiple ways to get cartManager
        if (typeof cartManager !== 'undefined') {
            cm = cartManager;
        } else if (typeof window !== 'undefined' && window.cartManager) {
            cm = window.cartManager;
        } else if (typeof CartManager !== 'undefined') {
            // Try to create it if class exists but instance doesn't
            try {
                cm = new CartManager();
                if (typeof window !== 'undefined') {
                    window.cartManager = cm;
                }
                console.log('✅ Created CartManager instance on-the-fly');
            } catch (e) {
                console.error('❌ Failed to create CartManager:', e);
            }
        }
        
        if (!cm) {
            console.error('❌ cartManager is not available!');
            console.error('   Attempting to create minimal fallback...');
            
            // Create minimal fallback cartManager
            const fallbackCapacities = {
                standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
                danish: 17
            };
            
            cm = {
                assignCartType: (order) => {
                    const danishCustomers = ['Superflora', 'Flamingo', 'Flower Trade Consult Bleiswijk', 'MM Flowers', 'Dijk Flora'];
                    const customerName = (order.customer || order.customerName || '').toLowerCase();
                    const isDanish = danishCustomers.some(dc => customerName.includes(dc.toLowerCase()));
                    return { ...order, cartType: isDanish ? 'danish' : 'standard' };
                },
                calculateCartsNeeded: (order) => {
                    const cartType = order.cartType || 'standard';
                    const quantity = order.quantity || 1;
                    const crateType = order.crateType || '612';
                    const capacity = cartType === 'danish' ? 17 : (fallbackCapacities.standard[crateType] || 72);
                    const carts = Math.ceil(quantity / capacity);
                    return { carts: carts, capacity: capacity, remaining: (carts * capacity) - quantity };
                },
                calculateRouteCarts: function(orders) {
                    // Group by customer and route
                    const routeCarts = {
                        rijnsburg: { standard: 0, danish: 0, orders: [], clients: {} },
                        aalsmeer: { standard: 0, danish: 0, orders: [], clients: {} },
                        naaldwijk: { standard: 0, danish: 0, orders: [], clients: {} }
                    };
                    
                    // Group by customer
                    const ordersByCustomer = {};
                    orders.forEach(order => {
                        const customerName = order.customer || order.customerName || `Order ${order.orderId || order.id}`;
                        if (!ordersByCustomer[customerName]) {
                            ordersByCustomer[customerName] = [];
                        }
                        ordersByCustomer[customerName].push(order);
                    });
                    
                    // Process each customer
                    Object.keys(ordersByCustomer).forEach(customerName => {
                        const customerOrders = ordersByCustomer[customerName];
                        const firstOrder = customerOrders[0];
                        const cartType = firstOrder.cartType || 'standard';
                        const totalQuantity = customerOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
                        const crateType = firstOrder.crateType || '612';
                        const capacity = cartType === 'danish' ? 17 : (fallbackCapacities.standard[crateType] || 72);
                        const cartsNeeded = Math.ceil(totalQuantity / capacity);
                        
                        // Determine route
                        const location = (firstOrder.deliveryLocation || firstOrder.location || '').toLowerCase();
                        let route = 'aalsmeer';
                        if (location.includes('rijnsburg')) route = 'rijnsburg';
                        else if (location.includes('naaldwijk')) route = 'naaldwijk';
                        else if (location.includes('aalsmeer')) route = 'aalsmeer';
                        else {
                            // Hash-based fallback
                            const routeHash = (customerName.charCodeAt(0) || 0) % 3;
                            const routes = ['rijnsburg', 'aalsmeer', 'naaldwijk'];
                            route = routes[routeHash];
                        }
                        
                        if (routeCarts[route]) {
                            if (cartType === 'danish') {
                                routeCarts[route].danish += cartsNeeded;
                            } else {
                                routeCarts[route].standard += cartsNeeded;
                            }
                            routeCarts[route].orders.push(...customerOrders);
                            if (!routeCarts[route].clients[customerName]) {
                                routeCarts[route].clients[customerName] = [];
                            }
                            routeCarts[route].clients[customerName].push(...customerOrders);
                        }
                    });
                    
                    return routeCarts;
                },
                capacities: fallbackCapacities,
                determineRoute: (order) => {
                    const location = (order.deliveryLocation || order.location || '').toLowerCase();
                    if (location.includes('rijnsburg')) return 'rijnsburg';
                    if (location.includes('aalsmeer')) return 'aalsmeer';
                    if (location.includes('naaldwijk')) return 'naaldwijk';
                    return 'aalsmeer';
                }
            };
            
            if (typeof window !== 'undefined') {
                window.cartManager = cm;
            }
            console.warn('⚠️ Using fallback cartManager - some features may not work correctly');
        }
        
        // Use the available cartManager
        const cartManagerToUse = cm;
        
        const ordersWithCartType = this.orders.map(order => 
            cartManagerToUse.assignCartType(order)
        );
        
        // Group orders by customer (CRITICAL: same customer orders go together)
        const ordersByCustomer = {};
        ordersWithCartType.forEach(order => {
            const customerName = order.customer || order.customerName || `Order ${order.orderId || order.id}`;
            if (!ordersByCustomer[customerName]) {
                ordersByCustomer[customerName] = [];
            }
            ordersByCustomer[customerName].push(order);
        });
        
        console.log(`📊 Grouped into ${Object.keys(ordersByCustomer).length} customer groups`);
        
        // Calculate carts per customer group
        const customerCartCounts = {};
        Object.keys(ordersByCustomer).forEach(customerName => {
            const customerOrders = ordersByCustomer[customerName];
            const firstOrder = customerOrders[0];
            const cartType = firstOrder.cartType;
            
            // Calculate total quantity for this customer
            const totalQuantity = customerOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
            
            // Calculate carts needed based on total quantity
            const crateType = firstOrder.crateType || '612';
            const capacity = cartType === 'danish' 
                ? cartManagerToUse.capacities.danish 
                : (cartManagerToUse.capacities.standard[crateType] || 72);
            
            const cartsNeeded = Math.ceil(totalQuantity / capacity);
            
            customerCartCounts[customerName] = {
                cartsNeeded: cartsNeeded,
                totalQuantity: totalQuantity,
                cartType: cartType,
                orderCount: customerOrders.length
            };
            
            if (Object.keys(customerCartCounts).length <= 5) {
                console.log(`📦 Customer "${customerName}": ${customerOrders.length} orders, ${totalQuantity} total qty, ${cartsNeeded} carts needed`);
            }
        });
        
        // Assign cart counts back to individual orders
        // Each order from same customer gets the same cart count (will be grouped later)
        let assignedCount = 0;
        let zeroCartCount = 0;
        
        this.orders = ordersWithCartType.map((order, index) => {
            const customerName = order.customer || order.customerName || `Order ${order.orderId || order.id}`;
            const customerInfo = customerCartCounts[customerName];
            
            if (customerInfo && customerInfo.cartsNeeded > 0) {
                assignedCount++;
                return {
                    ...order,
                    cartsNeeded: customerInfo.cartsNeeded, // Same for all orders from this customer
                    totalCustomerQuantity: customerInfo.totalQuantity,
                    customerOrderCount: customerInfo.orderCount,
                    cartCalculation: {
                        carts: customerInfo.cartsNeeded,
                        capacity: customerInfo.cartType === 'danish' 
                            ? cartManagerToUse.capacities.danish 
                            : (cartManagerToUse.capacities.standard[order.crateType || '612'] || 72),
                        totalQuantity: customerInfo.totalQuantity
                    }
                };
            } else {
                zeroCartCount++;
                return {
                    ...order,
                    cartsNeeded: 0,
                    cartCalculation: { carts: 0, capacity: 0, totalQuantity: 0 }
                };
            }
        });
        
        // Calculate total carts (sum of unique customers, not individual orders)
        const totalCarts = Object.values(customerCartCounts).reduce((sum, info) => sum + info.cartsNeeded, 0);
        console.log(`✅ Cart assignment complete:`);
        console.log(`   - ${Object.keys(ordersByCustomer).length} customer groups`);
        console.log(`   - ${assignedCount} orders assigned to groups`);
        console.log(`   - ${totalCarts} total carts needed (grouped by customer)`);
        console.log(`   - ${zeroCartCount} orders with 0 carts`);
        
        this.filteredOrders = [...this.orders];
        this.displayOrders();
    }
    END OF ORPHANED CODE */

    /**
     * Get cart summary - CRITICAL: Count each customer's cartsNeeded ONCE (not per order!)
     * 
     * IMPORTANT: assignCarts() sets the SAME cartsNeeded value on ALL orders from the same customer.
     * So if customer "ABC" has 5 orders and needs 10 carts, ALL 5 orders have cartsNeeded: 10.
     * We must count this as 10 carts TOTAL, not 5 × 10 = 50 carts!
     */
    getCartSummary() {
        const summary = {
            standard: 0,
            danish: 0,
            specialHandling: 0
        };
        
        // Group orders by customer first (same customer = same cart group)
        const ordersByCustomer = {};
        this.orders.forEach(order => {
            const customerName = order.customer || order.customerName || `Order ${order.orderId || order.id}`;
            if (!ordersByCustomer[customerName]) {
                ordersByCustomer[customerName] = [];
            }
            ordersByCustomer[customerName].push(order);
        });
        
        // For each customer, take cartsNeeded from FIRST order only (all orders have same value)
        Object.keys(ordersByCustomer).forEach(customerName => {
            const customerOrders = ordersByCustomer[customerName];
            const firstOrder = customerOrders[0];
            
            // CRITICAL: cartsNeeded is SAME for all orders from this customer
            // So we only count it ONCE (from first order)
            const cartsNeeded = firstOrder.cartsNeeded || 0;
            const cartType = firstOrder.cartType || 'standard';
            
            if (cartType === 'danish') {
                summary.danish += cartsNeeded;
                summary.specialHandling++;
            } else {
                summary.standard += cartsNeeded;
            }
        });
        
        console.log('📊 CART SUMMARY (grouped by customer):');
        console.log(`   Unique customers: ${Object.keys(ordersByCustomer).length}`);
        console.log(`   Standard carts: ${summary.standard}`);
        console.log(`   Danish carts: ${summary.danish}`);
        console.log(`   Total carts: ${summary.standard + summary.danish}`);

        return summary;
    }

    /**
     * Export orders to CSV
     */
    exportToCSV() {
        const headers = ['Order ID', 'Customer', 'Location', 'Product', 'Quantity', 'Cart Type', 'Carts Needed', 'Status'];
        const rows = this.filteredOrders.map(order => [
            order.orderId || order.id,
            order.customer,
            order.deliveryLocation,
            order.productType,
            order.quantity,
            order.cartType || 'pending',
            order.cartsNeeded || 0,
            order.status
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${this.currentDate.toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Update order count display
     */
    updateOrderCount() {
        const countElement = document.getElementById('total-orders-count');
        if (countElement) {
            countElement.textContent = this.orders.length;
        }
    }

    /**
     * Display orders in table
     */
    displayOrders() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredOrders.length === 0) {
            const noOrdersText = typeof i18n !== 'undefined' ? i18n.t('orders.noOrders', 'No orders found') : 'No orders found';
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px;">${noOrdersText}</td></tr>`;
            return;
        }

        this.filteredOrders.forEach(order => {
            const row = document.createElement('tr');
            
            // Use translations for cart type badges
            let cartTypeBadge = '';
            if (typeof i18n !== 'undefined') {
                const danishText = i18n.t('cartLoading.danish', 'Danish');
                const standardText = i18n.t('cartLoading.standard', 'Standard');
                cartTypeBadge = order.cartType === 'danish' 
                    ? `<span class="badge warning">${danishText}</span>`
                    : `<span class="badge info">${standardText}</span>`;
            } else {
                cartTypeBadge = order.cartType === 'danish' 
                    ? '<span class="badge warning">Danish</span>'
                    : '<span class="badge info">Standard</span>';
            }
            
            // Use translations for status and unknown values
            const unknownText = typeof i18n !== 'undefined' ? i18n.t('common.unknown', 'Unknown') : 'Unknown';
            const tbdText = typeof i18n !== 'undefined' ? i18n.t('common.tbd', 'TBD') : 'TBD';
            const pendingText = typeof i18n !== 'undefined' ? i18n.t('orders.pending', 'Pending') : 'Pending';
            const assignedText = typeof i18n !== 'undefined' ? i18n.t('orders.assigned', 'Assigned') : 'Assigned';
            
            const statusText = order.status === 'assigned' ? assignedText : pendingText;
            const statusClass = order.status === 'assigned' ? 'success' : 'warning';
            const statusBadge = `<span class="badge ${statusClass}">${statusText}</span>`;
            
            // Translate cart type
            const cartTypeText = order.cartType === 'danish' 
                ? (typeof i18n !== 'undefined' ? i18n.t('data.danish') : 'Danish')
                : (typeof i18n !== 'undefined' ? i18n.t('data.standard') : 'Standard');
            
            row.innerHTML = `
                <td>${order.orderId || order.id}</td>
                <td>${order.customer || unknownText}</td>
                <td>${order.deliveryLocation || tbdText}</td>
                <td>${order.productType || ''}</td>
                <td>${order.quantity || 0}</td>
                <td>${order.crateType || '612'}</td>
                <td>${cartTypeBadge}</td>
                <td>${order.cartsNeeded || 0}</td>
                <td>${order.deliveryLocation || tbdText}</td>
                <td>${statusBadge}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
        console.error(message);
    }
}

// Global instance
// OrderManager is now provided by ordermanager-shim.js
// const orderManager = new OrderManager(); // REMOVED - using shim instead

// Reload orders display when language changes
document.addEventListener('languageChanged', () => {
    if (orderManager) {
        orderManager.displayOrders();
        if (typeof updateSummary === 'function') {
            updateSummary();
        }
    }
});


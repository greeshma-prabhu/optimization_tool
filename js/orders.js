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
        
        // Try to load orders from localStorage on initialization
        this.loadOrdersFromStorage();
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

        console.log(`Processing ${rawOrders.length} orders`);
        
        // Log first order structure to debug API field mapping
        if (rawOrders.length > 0) {
            console.log('=================================');
            console.log('📋 RAW API ORDER STRUCTURE (FIRST ORDER):');
            console.log(JSON.stringify(rawOrders[0], null, 2));
            console.log('=================================');
            console.log('📋 ALL AVAILABLE FIELDS IN FIRST ORDER:');
            console.log(Object.keys(rawOrders[0]));
            console.log('=================================');
            
            // Log key fields for debugging (console only, no alerts in production)
            const firstOrderKeys = Object.keys(rawOrders[0]);
            const firstOrder = rawOrders[0];
            
            // Check actual API fields (console only)
            const qtyField = firstOrder.amount_of_transport_carriers !== undefined ? `amount_of_transport_carriers: ${firstOrder.amount_of_transport_carriers}` :
                           firstOrder.amount_of_plates !== undefined ? `amount_of_plates: ${firstOrder.amount_of_plates}` :
                           firstOrder.assembly_amount !== undefined ? `assembly_amount: ${firstOrder.assembly_amount}` :
                           firstOrder.quantity !== undefined ? `quantity: ${firstOrder.quantity}` :
                           'NOT FOUND (will use fallback)';
            
            const customerField = firstOrder.customer || firstOrder.customer_name || firstOrder.client || 
                                 (firstOrder.order_id ? `order_id: ${firstOrder.order_id} (will use as fallback)` : 'NOT FOUND');
            
            const locationField = firstOrder.delivery_location || firstOrder.location || firstOrder.hub || 'NOT FOUND';
            
            // Log to console only (no alert popup in production)
            console.log('📋 Key API fields:', { qtyField, customerField, locationField });
            
            // Log first 3 orders to see patterns
            if (rawOrders.length >= 3) {
                console.log('📋 FIRST 3 ORDERS - KEY FIELDS:');
                rawOrders.slice(0, 3).forEach((order, idx) => {
                    console.log(`Order ${idx}:`, {
                        id: order.id,
                        order_id: order.order_id,
                        customer: order.customer,
                        customer_name: order.customer_name,
                        client: order.client,
                        delivery_location: order.delivery_location,
                        location: order.location,
                        quantity: order.quantity,
                        amount: order.amount,
                        qty: order.qty,
                        product_code: order.product_code,
                        composite_product_id: order.composite_product_id,
                        hasOrder: !!order.order,
                        hasCustomer: !!order.customer
                    });
                });
            }
        }
        
        const processedOrders = rawOrders.map((order, index) => {
            // Map API fields to our format
            // The API returns orderrows which may have nested structures
            // Check for order.order, order.customer, order.composite_product, etc.
            
            // Extract customer - AGGRESSIVE search through ALL possible paths
            let customerName = '';
            
            // Function to safely extract string from any value
            const extractString = (val) => {
                if (!val) return '';
                if (typeof val === 'string') return val.trim();
                if (typeof val === 'object' && val !== null) {
                    return val.name || val.customerName || val.clientName || val.client || val.companyName || val.title || '';
                }
                return String(val).trim();
            };
            
            // ALL possible customer field paths (in order of likelihood)
            const customerPaths = [
                // Direct fields
                () => order.customer,
                () => order.customer_name,
                () => order.customerName,
                () => order.client,
                () => order.client_name,
                () => order.clientName,
                () => order.company,
                () => order.company_name,
                () => order.companyName,
                // Nested order.order fields
                () => order.order?.customer,
                () => order.order?.customer_name,
                () => order.order?.customerName,
                () => order.order?.client,
                () => order.order?.client_name,
                () => order.order?.clientName,
                // Nested order.order.customer object
                () => order.order?.customer?.name,
                () => order.order?.customer?.customerName,
                () => order.order?.customer?.clientName,
                () => order.order?.customer?.client,
                () => order.order?.customer?.companyName,
                // Nested order.client object
                () => order.order?.client?.name,
                () => order.order?.client?.customerName,
                () => order.order?.client?.clientName,
                // Deep nested paths
                () => order.order?.order?.customer,
                () => order.order?.order?.customer?.name,
                () => order.order?.order?.client,
                () => order.order?.order?.client?.name,
            ];
            
            // Try all paths
            for (const path of customerPaths) {
                try {
                    const val = path();
                    if (val) {
                        customerName = extractString(val);
                        if (customerName) break;
                    }
                } catch (e) {
                    // Path doesn't exist, continue
                }
            }
            
            // If still not found, check if this was joined with full order
            if (!customerName && order._joined && order.customer) {
                customerName = order.customer;
            }
            
            // If still not found, use order_id as fallback
            if (!customerName) {
                if (order.order_id) {
                    customerName = `Order ${order.order_id}`;
                } else if (order.id) {
                    customerName = `Order ${order.id}`;
                } else {
                    customerName = `Order ${index}`;
                }
                
                // Log warning for first few orders
                if (index < 3) {
                    console.warn(`⚠️ Customer not found for order ${index}, using fallback:`, {
                        customerName: customerName,
                        order_id: order.order_id,
                        id: order.id,
                        hasJoined: order._joined,
                        availableFields: Object.keys(order)
                    });
                }
            }
            
            // Extract location - check order.order first (most likely)
            let location = '';
            if (order.order) {
                if (order.order.delivery_location) location = order.order.delivery_location;
                else if (order.order.deliveryLocation) location = order.order.deliveryLocation;
                else if (order.order.location) location = order.order.location;
                else if (order.order.delivery_address) location = order.order.delivery_address;
                else if (order.order.hub) location = order.order.hub;
                else if (order.order.delivery_hub) location = order.order.delivery_hub;
            }
            
            // Try direct fields
            if (!location) {
                if (order.deliveryLocation) location = order.deliveryLocation;
                else if (order.delivery_location) location = order.delivery_location;
                else if (order.location) location = order.location;
                else if (order.delivery_address) location = order.delivery_address;
                else if (order.deliveryAddress) location = order.deliveryAddress;
                else if (order.hub) location = order.hub;
            }
            
            // Extract product/crate info - check composite_product_id first
            let productCode = '';
            
            // API likely has composite_product_id - we need to extract code from it
            if (order.composite_product_id) {
                // If it's a number, we might need to look it up, but try to use it as-is
                productCode = order.composite_product_id.toString();
            } else if (order.composite_product) {
                if (typeof order.composite_product === 'string') {
                    productCode = order.composite_product;
                } else if (order.composite_product.code) {
                    productCode = order.composite_product.code;
                } else if (order.composite_product.productCode) {
                    productCode = order.composite_product.productCode;
                } else if (order.composite_product.id) {
                    productCode = order.composite_product.id.toString();
                }
            }
            
            // Try direct fields
            if (!productCode) {
                if (order.productCode) productCode = order.productCode;
                else if (order.product_code) productCode = order.product_code;
                else if (order.code) productCode = order.code;
            }
            
            // Extract quantity - API uses amount_of_transport_carriers or amount_of_plates
            // Based on actual API structure: id, composite_product_id, amount_of_transport_carriers, amount_of_plates, etc.
            let quantity = 0;
            
            // Try Florinet API specific fields first
            // Note: amount_of_transport_carriers might be 0, so we check if it exists (even if 0)
            if (order.amount_of_transport_carriers !== undefined && order.amount_of_transport_carriers !== null) {
                const val = parseInt(order.amount_of_transport_carriers, 10);
                if (!isNaN(val)) {
                    quantity = val; // Use even if 0 - it's a valid value from API
                }
            } else if (order.amount_of_plates !== undefined && order.amount_of_plates !== null) {
                const val = parseInt(order.amount_of_plates, 10);
                if (!isNaN(val)) {
                    quantity = val;
                }
            } else if (order.assembly_amount !== undefined && order.assembly_amount !== null) {
                const val = parseInt(order.assembly_amount, 10);
                if (!isNaN(val)) {
                    quantity = val;
                }
            }
            
            // Fallback to standard quantity fields only if we haven't found anything
            if (quantity === 0 && order.amount_of_transport_carriers === undefined && order.amount_of_plates === undefined && order.assembly_amount === undefined) {
                const quantityFields = [
                    'quantity', 'amount', 'qty', 'ordered_quantity', 'amount_ordered',
                    'qty_ordered', 'ordered_qty', 'total_quantity', 'total_amount',
                    'pieces', 'units', 'count', 'number'
                ];
                
                for (const field of quantityFields) {
                    if (order[field] !== undefined && order[field] !== null) {
                        const val = parseInt(order[field], 10);
                        if (!isNaN(val) && val > 0) {
                            quantity = val;
                            break;
                        }
                    }
                }
            }
            
            // Try nested order.order.quantity
            if (quantity === 0 && order.order) {
                if (order.order.amount_of_transport_carriers !== undefined && order.order.amount_of_transport_carriers !== null) {
                    const val = parseInt(order.order.amount_of_transport_carriers, 10);
                    if (!isNaN(val)) quantity = val;
                } else if (order.order.amount_of_plates !== undefined && order.order.amount_of_plates !== null) {
                    const val = parseInt(order.order.amount_of_plates, 10);
                    if (!isNaN(val)) quantity = val;
                }
            }
            
            // If still 0 after all checks, use minimum 1 for cart calculation
            // (0 quantity would result in 0 carts, which breaks optimization)
            if (quantity === 0) {
                if (index < 3) { // Log first 3 to debug
                    const qtyFields = Object.keys(order).filter(k => {
                        const lower = k.toLowerCase();
                        return lower.includes('qty') || lower.includes('amount') || lower.includes('quant') || lower.includes('piece') || lower.includes('unit') || lower.includes('carrier') || lower.includes('plate');
                    });
                    console.warn(`⚠️ Order ${order.id || index} has quantity 0 after all checks. Available qty fields:`, qtyFields);
                    console.warn(`   amount_of_transport_carriers: ${order.amount_of_transport_carriers}, amount_of_plates: ${order.amount_of_plates}, assembly_amount: ${order.assembly_amount}`);
                }
                // Use minimum 1 for cart calculation (0 would = 0 carts)
                quantity = 1; // Minimum quantity for cart calculation
            }
            
            // Use order_id as fallback identifier
            const orderId = order.order_id || order.orderId || order.id || `order-${index}`;
            
            const processed = {
                id: order.id || orderId,
                orderId: orderId,
                // Store order_id for potential lookup
                orderRowId: order.id,
                customer: customerName || `Order ${orderId}`,
                customerName: customerName || `Order ${orderId}`,
                deliveryLocation: location || '',
                productType: order.productType || order.product_type || order.product || '',
                productCode: productCode || '',
                crateType: order.crateType || order.crate_type || this.extractCrateType(order) || '612',
                quantity: quantity,
                date: order.deliveryDate || order.delivery_date || order.date || this.currentDate.toISOString().split('T')[0],
                status: order.status || order.state || 'pending',
                // Will be assigned by cart manager
                cartType: null,
                cartsNeeded: null,
                // Store raw order for debugging
                _raw: order
            };
            
            // Log first few orders to debug field mapping
            if (index < 5) {
                // Find all quantity-related fields
                const quantityFields = {};
                Object.keys(order).forEach(k => {
                    const lower = k.toLowerCase();
                    if (lower.includes('qty') || lower.includes('amount') || lower.includes('quant') || lower.includes('piece') || lower.includes('unit')) {
                        quantityFields[k] = order[k];
                    }
                });
                
                // Find all customer-related fields
                const customerFields = {};
                Object.keys(order).forEach(k => {
                    const lower = k.toLowerCase();
                    if (lower.includes('customer') || lower.includes('client') || lower.includes('company')) {
                        customerFields[k] = order[k];
                    }
                });
                
                console.log(`📋 Order ${index} mapping:`, {
                    rawKeys: Object.keys(order).slice(0, 20),
                    customer: processed.customer,
                    location: processed.deliveryLocation,
                    quantity: processed.quantity,
                    crateType: processed.crateType,
                    hasNestedOrder: !!order.order,
                    hasNestedCustomer: !!(order.customer && typeof order.customer === 'object'),
                    quantityFields: quantityFields,
                    customerFields: customerFields,
                    // Show raw values for common fields
                    rawQuantity: order.quantity,
                    rawAmount: order.amount,
                    rawQty: order.qty,
                    rawOrderId: order.order_id,
                    rawCompositeProductId: order.composite_product_id
                });
            }
            
            return processed;
        });
        
        console.log(`✅ Processed ${processedOrders.length} orders`);
        return processedOrders;
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
     * CRITICAL: Group orders by customer first, then calculate carts per customer group
     */
    assignCarts() {
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

    /**
     * Get cart summary - CRITICAL: Group by customer first, then sum
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
        
        // Sum carts per customer (not per order) - each customer contributes once
        Object.keys(ordersByCustomer).forEach(customerName => {
            const customerOrders = ordersByCustomer[customerName];
            const firstOrder = customerOrders[0];
            const cartType = firstOrder.cartType || 'standard';
            const cartsNeeded = firstOrder.cartsNeeded || 0; // Same for all orders from same customer
            
            if (cartType === 'danish') {
                summary.danish += cartsNeeded; // Add once per customer, not per order
                summary.specialHandling++;
            } else {
                summary.standard += cartsNeeded; // Add once per customer, not per order
            }
        });

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
const orderManager = new OrderManager();

// Reload orders display when language changes
document.addEventListener('languageChanged', () => {
    if (orderManager) {
        orderManager.displayOrders();
        if (typeof updateSummary === 'function') {
            updateSummary();
        }
    }
});


/**
 * Zuidplas Logistics - Cart Assignment Logic
 * Handles cart type assignment, capacity calculations, and loading visualization
 */

class CartManager {
    constructor() {
        // TRUCK CAPACITY RULES (from business requirements)
        this.truckCapacity = {
            maxStandard: 17,        // Maximum 17 standard carts
            maxWithDanish: 16,      // If > 6 Danish carts, max reduces to 16
            danishThreshold: 6      // Threshold for capacity reduction
        };
        
        // CART CAPACITIES (from business requirements)
        // Standard carts - capacity varies by crate type
        // Danish carts - 24 crates per cart (4 layers of 6)
        this.capacities = typeof CART_CAPACITIES !== 'undefined' ? CART_CAPACITIES : {
            standard: { 
                '612': 72,  // 3 layers of 24
                '575': 32,  // Extra layer: 16×612 or 10×902
                '902': 40,  // 4 layers of 10
                '588': 40,  // Auction trade only
                '996': 32,  // Extra: 10×902 or 12×612
                '856': 20   // 
            },
            danish: 24      // 4 layers of 6 crates per Danish cart
        };
        
        // DANISH CART CUSTOMERS (from business requirements)
        // These customers ALWAYS get Danish carts
        this.danishCustomers = typeof DANISH_CART_CUSTOMERS !== 'undefined' ? DANISH_CART_CUSTOMERS : [
            'Superflora',
            'Flamingo',
            'Flower Trade Consult Bleiswijk',
            'MM Flowers',
            'Dijk Flora'
        ];
    }

    /**
     * Assign cart type to order based on customer
     */
    assignCartType(order) {
        const customerName = order.customer || order.customerName || '';
        
        // Check if customer requires Danish cart
        const requiresDanish = this.danishCustomers.some(
            danishCustomer => customerName.toLowerCase().includes(danishCustomer.toLowerCase())
        );

        return {
            ...order,
            cartType: requiresDanish ? 'danish' : 'standard',
            requiresDanish: requiresDanish
        };
    }

    /**
     * Calculate number of carts needed for an order
     * 
     * CRITICAL FIX based on feedback report:
     * We calculate carts based on FUST (containers), not stems!
     * 
     * Formula: carts = fust_count ÷ capacity_per_fust_type
     */
    calculateCartsNeeded(order) {
        // Get fust code (container type) from order
        const fustCode = order.fust_code || order.container_code || order.crateType || order.productCode || '612';
        
        // Get fust count (number of containers)
        const fustCount = order.fust_count || 0;
        
        // Validate fust count
        if (!fustCount || fustCount <= 0) {
            console.warn(`⚠️ Order ${order.id} has invalid fust_count:`, fustCount, '- skipping cart calculation');
            return {
                carts: 0,
                type: order.cartType || 'standard',
                capacity: 0,
                remaining: 0
            };
        }
        
        if (order.cartType === 'danish') {
            // Danish cart calculation
            const cartsNeeded = Math.ceil(fustCount / this.capacities.danish);
            return {
                carts: cartsNeeded,
                type: 'danish',
                capacity: this.capacities.danish,
                fustCount: fustCount,
                remaining: (cartsNeeded * this.capacities.danish) - fustCount
            };
        } else {
            // Standard cart - capacity depends on fust type
            const capacity = this.capacities.standard[fustCode] || this.capacities.standard['612'];
            const cartsNeeded = Math.ceil(fustCount / capacity);
            return {
                carts: cartsNeeded,
                type: 'standard',
                capacity: capacity,
                fustCode: fustCode,
                fustCount: fustCount,
                remaining: (cartsNeeded * capacity) - fustCount
            };
        }
    }

    /**
     * Group orders by route and calculate total carts
     * CRITICAL: Group orders by client first - same client orders go on same cart
     */
    calculateRouteCarts(orders) {
        console.log('=================================');
        console.log('🛒 CALCULATING ROUTE CARTS');
        console.log(`Input: ${orders.length} orders`);
        console.log('=================================');
        
        // First, group orders by client (CRITICAL REQUIREMENT)
        const ordersByClient = {};
        let unknownCount = 0;
        
        orders.forEach((order, idx) => {
            const clientName = order.customer || order.customerName || 'Unknown';
            
            // Debug first few orders
            if (idx < 5) {
                console.log(`Order ${idx} client extraction:`, {
                    id: order.id,
                    customer: order.customer,
                    customerName: order.customerName,
                    client: order.client,
                    extracted: clientName
                });
            }
            
            if (clientName === 'Unknown') {
                unknownCount++;
            }
            
            if (!ordersByClient[clientName]) {
                ordersByClient[clientName] = [];
            }
            ordersByClient[clientName].push(order);
        });
        
        console.log(`📊 Grouped into ${Object.keys(ordersByClient).length} clients`);
        console.log(`⚠️ ${unknownCount} orders with Unknown client`);
        console.log('Client distribution:', Object.keys(ordersByClient).slice(0, 10));

        const routeCarts = {
            rijnsburg: { standard: 0, danish: 0, orders: [], clients: {} },
            aalsmeer: { standard: 0, danish: 0, orders: [], clients: {} },
            naaldwijk: { standard: 0, danish: 0, orders: [], clients: {} }
        };

        // Process each client's orders together
        Object.keys(ordersByClient).forEach((clientName, clientIdx) => {
            const clientOrders = ordersByClient[clientName];
            
            // Debug first few clients
            if (clientIdx < 5) {
                console.log(`Processing client ${clientIdx}: "${clientName}" with ${clientOrders.length} orders`);
            }
            
            // Assign cart type (same for all orders from same client)
            const firstOrder = clientOrders[0];
            const orderWithCart = this.assignCartType(firstOrder);
            const cartType = orderWithCart.cartType; // Declare once here
            
            // Calculate total carts needed for all orders from this client
            // CRITICAL: Calculate based on TOTAL quantity, not sum of individual order carts
            let totalQuantity = 0;
            
            clientOrders.forEach((order, orderIdx) => {
                // CRITICAL FIX: Use fust_count (containers), not quantity or stems!
                totalQuantity += (order.fust_count || order.quantity || 0);
                
                // Debug first order of first few clients
                if (clientIdx < 3 && orderIdx === 0) {
                    const orderWithCartType = this.assignCartType(order);
                    const fustCode = order.fust_code || order.container_code || '612';
                    console.log(`  First order:`, {
                        fust_count: order.fust_count,
                        fust_code: fustCode,
                        quantity: order.quantity,
                        cartType: orderWithCartType.cartType,
                        capacity: orderWithCartType.cartType === 'danish' 
                            ? this.capacities.danish 
                            : (this.capacities.standard[fustCode] || 72)
                    });
                }
            });
            
            // Calculate carts based on TOTAL fust count for this customer (not per-order)
            // Use the correct capacity based on fust type!
            const fustCode = firstOrder.fust_code || firstOrder.container_code || '612';
            const capacity = cartType === 'danish' 
                ? this.capacities.danish 
                : (this.capacities.standard[fustCode] || 72);
            
            const totalCarts = Math.ceil(totalQuantity / capacity);
            
            // Determine route from delivery location
            const route = this.determineRoute(firstOrder);
            
            if (clientIdx < 5) {
                console.log(`  → Route: ${route}, Total carts: ${totalCarts}, Total fust: ${totalQuantity.toFixed(2)}, Capacity: ${capacity}`);
            }
            
            if (routeCarts[route]) {
                if (cartType === 'danish') {
                    routeCarts[route].danish += totalCarts;
                } else {
                    routeCarts[route].standard += totalCarts;
                }
                
                // Store all client orders together
                if (!routeCarts[route].clients[clientName]) {
                    routeCarts[route].clients[clientName] = [];
                }
                
                // Store all client orders together with the SAME cart count (per customer, not per order)
                clientOrders.forEach(order => {
                    const orderWithCartType = this.assignCartType(order);
                    routeCarts[route].orders.push({
                        ...orderWithCartType,
                        cartsNeeded: totalCarts, // Same for all orders from this customer
                        cartCalculation: {
                            carts: totalCarts,
                            capacity: capacity,
                            totalQuantity: totalQuantity
                        },
                        clientGroup: clientName // Mark which client group this belongs to
                    });
                    routeCarts[route].clients[clientName].push({
                        ...orderWithCartType,
                        cartsNeeded: totalCarts // Same for all orders from this customer
                    });
                });
            }
        });
        
        console.log('=================================');
        console.log('📊 ROUTE CARTS SUMMARY:');
        console.log('Rijnsburg:', {
            standard: routeCarts.rijnsburg.standard,
            danish: routeCarts.rijnsburg.danish,
            total: routeCarts.rijnsburg.standard + routeCarts.rijnsburg.danish,
            clients: Object.keys(routeCarts.rijnsburg.clients).length
        });
        console.log('Aalsmeer:', {
            standard: routeCarts.aalsmeer.standard,
            danish: routeCarts.aalsmeer.danish,
            total: routeCarts.aalsmeer.standard + routeCarts.aalsmeer.danish,
            clients: Object.keys(routeCarts.aalsmeer.clients).length
        });
        console.log('Naaldwijk:', {
            standard: routeCarts.naaldwijk.standard,
            danish: routeCarts.naaldwijk.danish,
            total: routeCarts.naaldwijk.standard + routeCarts.naaldwijk.danish,
            clients: Object.keys(routeCarts.naaldwijk.clients).length
        });
        console.log('=================================');

        return routeCarts;
    }

    /**
     * Determine route from order data
     * 
     * CRITICAL FIX: Use delivery_location_id (from feedback report)
     *   - delivery_location_id = 32 → Aalsmeer
     *   - delivery_location_id = 34 → Naaldwijk
     *   - delivery_location_id = 36 → Rijnsburg
     */
    determineRoute(order) {
        // PRIORITY 1: Use delivery_location_id (most accurate!)
        const deliveryLocationId = order.delivery_location_id || order.deliveryLocationId;
        if (deliveryLocationId) {
            switch(deliveryLocationId) {
                case 32: return 'aalsmeer';
                case 34: return 'naaldwijk';
                case 36: return 'rijnsburg';
            }
        }
        
        // PRIORITY 2: Check if route is already set by API enrichment
        if (order.route && ['rijnsburg', 'aalsmeer', 'naaldwijk'].includes(order.route.toLowerCase())) {
            return order.route.toLowerCase();
        }
        
        // FALLBACK: Use location name
        const location = (order.deliveryLocation || order.location || order.location_name || order.delivery_address || '').toLowerCase();
        const customer = (order.customer || order.customer_name || order.customerName || order.client || '').toLowerCase();
        
        // Check location
        if (location) {
            if (location.includes('rijnsburg') || location.includes('rijnsberg')) {
                return 'rijnsburg';
            }
            
            if (location.includes('aalsmeer')) {
                return 'aalsmeer';
            }
            
            if (location.includes('naaldwijk')) {
                return 'naaldwijk';
            }
        }
        
        // Check customer name against client lists (case-insensitive partial match)
        if (customer && customer !== 'unknown' && typeof ROUTES !== 'undefined') {
            // Check Rijnsburg clients
            if (ROUTES.rijnsburg && ROUTES.rijnsburg.clientList) {
                for (const clientName of ROUTES.rijnsburg.clientList) {
                    if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                        return 'rijnsburg';
                    }
                }
            }
            
            // Check Aalsmeer clients
            if (ROUTES.aalsmeer && ROUTES.aalsmeer.clientList) {
                for (const clientName of ROUTES.aalsmeer.clientList) {
                    if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                        return 'aalsmeer';
                    }
                }
            }
            
            // Check Naaldwijk clients
            if (ROUTES.naaldwijk && ROUTES.naaldwijk.clientList) {
                for (const clientName of ROUTES.naaldwijk.clientList) {
                    if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                        return 'naaldwijk';
                    }
                }
            }
        }
        
        // Default to Rijnsburg
        return 'rijnsburg';
    }

    /**
     * Check capacity constraints for a route
     * BUSINESS RULE: If > 6 Danish carts, max capacity reduces from 17 to 16
     * BUSINESS RULE: 2 Danish carts ≈ 1 standard cart (Danish carts are slightly larger)
     */
    checkCapacity(standardCarts, danishCarts) {
        // CRITICAL: If > 6 Danish carts, truck capacity reduces to 16 instead of 17
        const maxCapacity = danishCarts > this.truckCapacity.danishThreshold 
            ? this.truckCapacity.maxWithDanish 
            : this.truckCapacity.maxStandard;
        
        const totalCarts = standardCarts + danishCarts;
        // Danish cart conversion: 2 Danish ≈ 1 standard
        const equivalentStandard = standardCarts + Math.ceil(danishCarts / 2);
        
        return {
            totalCarts,
            standardCarts,
            danishCarts,
            equivalentStandard,
            maxCapacity,
            fits: equivalentStandard <= maxCapacity,
            overflow: Math.max(0, equivalentStandard - maxCapacity),
            utilization: ((equivalentStandard / maxCapacity) * 100).toFixed(1),
            status: equivalentStandard <= maxCapacity ? 'fits' : 
                   equivalentStandard <= maxCapacity + 2 ? 'tight' : 'overflow',
            warning: danishCarts > this.truckCapacity.danishThreshold 
                ? (typeof i18n !== 'undefined' 
                    ? i18n.t('carts.danishCapacityWarning', `⚠️ More than ${this.truckCapacity.danishThreshold} Danish carts - capacity reduced to ${maxCapacity}`)
                    : `⚠️ More than ${this.truckCapacity.danishThreshold} Danish carts - capacity reduced to ${maxCapacity}`)
                : null
        };
    }

    /**
     * Calculate spacing between orders on cart
     * CRITICAL RULE: Orders per client need to be loaded on the same cart
     * Returns array of cart layouts with order assignments
     */
    calculateCartLayout(orders) {
        // CRITICAL: Group orders by client first - same client must be on same cart
        const ordersByClient = {};
        orders.forEach(order => {
            const clientName = order.customer || order.customerName || 'Unknown';
            if (!ordersByClient[clientName]) {
                ordersByClient[clientName] = [];
            }
            ordersByClient[clientName].push(order);
        });

        const layouts = [];
        
        // Process each client's orders together
        Object.keys(ordersByClient).forEach(clientName => {
            const clientOrders = ordersByClient[clientName];
            
            // Calculate total carts needed for this client
            let totalCartsNeeded = 0;
            let cartType = null;
            let maxCapacity = 0;
            
            clientOrders.forEach(order => {
                const cartCalc = this.calculateCartsNeeded(order);
                totalCartsNeeded += cartCalc.carts;
                if (!cartType) cartType = cartCalc.type;
                if (!maxCapacity) maxCapacity = cartCalc.capacity;
            });

            // Create carts for this client (all orders together)
            for (let cartIndex = 0; cartIndex < totalCartsNeeded; cartIndex++) {
                layouts.push({
                    client: clientName,
                    orders: clientOrders, // All orders from same client
                    cartNumber: cartIndex + 1,
                    totalCarts: totalCartsNeeded,
                    capacity: maxCapacity,
                    maxCapacity: maxCapacity,
                    type: cartType,
                    specialHandling: this.getSpecialHandling(clientOrders)
                });
            }
        });

        return layouts;
    }

    /**
     * Get special handling flags for orders
     */
    getSpecialHandling(orders) {
        const flags = {
            apartHouden: false,
            vroeg: false,
            caac: []
        };

        orders.forEach(order => {
            // Check for special handling flags in order data
            const specialFlags = order.specialFlags || order.legenda || [];
            
            if (specialFlags.includes('Apart Houden') || order.apartHouden) {
                flags.apartHouden = true;
            }
            if (specialFlags.includes('Vroeg!') || order.vroeg) {
                flags.vroeg = true;
            }
            
            // Check for Caac flags
            for (let i = 1; i <= 5; i++) {
                if (specialFlags.includes(`Caac ${i}`) || order[`caac${i}`]) {
                    flags.caac.push(i);
                }
            }
        });

        return flags;
    }
}

// Global instance - Initialize with error handling
let cartManager;

try {
    // Check if required dependencies exist
    if (typeof CART_CAPACITIES === 'undefined') {
        console.error('❌ CART_CAPACITIES not defined! Creating fallback...');
        // Create fallback capacities (from business requirements)
        if (typeof window !== 'undefined') {
            window.CART_CAPACITIES = {
                standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
                danish: 24  // 4 layers of 6 crates per Danish cart
            };
        }
    }
    
    if (typeof DANISH_CART_CUSTOMERS === 'undefined') {
        console.warn('⚠️ DANISH_CART_CUSTOMERS not defined, using empty array');
        if (typeof window !== 'undefined') {
            window.DANISH_CART_CUSTOMERS = [];
        }
    }
    
    cartManager = new CartManager();
    
    // Make it available globally
    if (typeof window !== 'undefined') {
        window.cartManager = cartManager;
    }
    
    console.log('✅ CartManager initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize CartManager:', error);
    // Create a minimal fallback (from business requirements)
    const fallbackCapacities = {
        standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
        danish: 24  // 4 layers of 6 crates per Danish cart
    };
    
    cartManager = {
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
            const capacity = cartType === 'danish' ? 24 : (fallbackCapacities.standard[crateType] || 72);
            const carts = Math.ceil(quantity / capacity);
            return { carts: carts, capacity: capacity, remaining: (carts * capacity) - quantity };
        },
        capacities: fallbackCapacities,
        determineRoute: (order) => {
            const location = (order.deliveryLocation || order.location || '').toLowerCase();
            if (location.includes('rijnsburg')) return 'rijnsburg';
            if (location.includes('aalsmeer')) return 'aalsmeer';
            if (location.includes('naaldwijk')) return 'naaldwijk';
            return 'aalsmeer';
        },
        calculateRouteCarts: function(orders) {
            // Minimal implementation
            return {
                rijnsburg: { standard: 0, danish: 0, orders: [], clients: {} },
                aalsmeer: { standard: 0, danish: 0, orders: [], clients: {} },
                naaldwijk: { standard: 0, danish: 0, orders: [], clients: {} }
            };
        }
    };
    
    if (typeof window !== 'undefined') {
        window.cartManager = cartManager;
    }
    console.warn('⚠️ Using fallback CartManager - some features may be limited');
}


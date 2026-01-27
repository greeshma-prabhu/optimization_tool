/**
 * Zuidplas Logistics - Cart Assignment Logic
 * Handles cart type assignment, capacity calculations, and loading visualization
 */

class CartManager {
    constructor() {
        // Use dependencies with fallbacks
        this.capacities = typeof CART_CAPACITIES !== 'undefined' ? CART_CAPACITIES : {
            standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
            danish: 17
        };
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
     */
    calculateCartsNeeded(order) {
        const crateType = order.crateType || order.productCode || '612';
        const quantity = parseInt(order.quantity || order.amount || 0, 10);
        
        // Validate quantity
        if (!quantity || quantity <= 0) {
            console.warn(`⚠️ Order ${order.id} has invalid quantity:`, quantity, '- using default 100');
            const defaultQty = 100;
            
            if (order.cartType === 'danish') {
                const cartsNeeded = Math.ceil(defaultQty / this.capacities.danish);
                return {
                    carts: cartsNeeded,
                    type: 'danish',
                    capacity: this.capacities.danish,
                    remaining: (cartsNeeded * this.capacities.danish) - defaultQty
                };
            } else {
                const capacity = this.capacities.standard[crateType] || this.capacities.standard['612'];
                const cartsNeeded = Math.ceil(defaultQty / capacity);
                return {
                    carts: cartsNeeded,
                    type: 'standard',
                    capacity: capacity,
                    crateType: crateType,
                    remaining: (cartsNeeded * capacity) - defaultQty
                };
            }
        }
        
        if (order.cartType === 'danish') {
            const cartsNeeded = Math.ceil(quantity / this.capacities.danish);
            return {
                carts: cartsNeeded,
                type: 'danish',
                capacity: this.capacities.danish,
                remaining: (cartsNeeded * this.capacities.danish) - quantity
            };
        } else {
            // Standard cart
            const capacity = this.capacities.standard[crateType] || this.capacities.standard['612'];
            const cartsNeeded = Math.ceil(quantity / capacity);
            return {
                carts: cartsNeeded,
                type: 'standard',
                capacity: capacity,
                crateType: crateType,
                remaining: (cartsNeeded * capacity) - quantity
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
                totalQuantity += (order.quantity || 0);
                
                // Debug first order of first few clients
                if (clientIdx < 3 && orderIdx === 0) {
                    const orderWithCartType = this.assignCartType(order);
                    console.log(`  First order:`, {
                        quantity: order.quantity,
                        crateType: order.crateType,
                        cartType: orderWithCartType.cartType,
                        capacity: orderWithCartType.cartType === 'danish' 
                            ? this.capacities.danish 
                            : (this.capacities.standard[order.crateType || '612'] || 72)
                    });
                }
            });
            
            // Calculate carts based on TOTAL quantity for this customer (not per-order)
            // cartType already declared above, reuse it
            const crateType = firstOrder.crateType || '612';
            const capacity = cartType === 'danish' 
                ? this.capacities.danish 
                : (this.capacities.standard[crateType] || 72);
            
            const totalCarts = Math.ceil(totalQuantity / capacity);
            
            // Determine route from delivery location
            const route = this.determineRoute(firstOrder);
            
            if (clientIdx < 5) {
                console.log(`  → Route: ${route}, Total carts: ${totalCarts}, Total quantity: ${totalQuantity}`);
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
     */
    determineRoute(order) {
        const location = (order.deliveryLocation || order.location || order.delivery_address || '').toLowerCase();
        const customer = (order.customer || order.customerName || order.client || '').toLowerCase();
        
        // Debug logging for first few orders
        if (Math.random() < 0.05) { // Log 5% of orders to debug
            console.log('🔍 Determining route for order:', {
                customer: customer || '(empty)',
                location: location || '(empty)',
                orderId: order.id || order.orderId,
                rawOrder: order
            });
        }
        
        // Check location first (most reliable)
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
        if (customer && customer !== 'unknown') {
            // Check Rijnsburg clients
            for (const clientName of ROUTES.rijnsburg.clientList) {
                if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                    return 'rijnsburg';
                }
            }
            
            // Check Aalsmeer clients
            for (const clientName of ROUTES.aalsmeer.clientList) {
                if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                    return 'aalsmeer';
                }
            }
            
            // Check Naaldwijk clients
            for (const clientName of ROUTES.naaldwijk.clientList) {
                if (customer.includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(customer)) {
                    return 'naaldwijk';
                }
            }
        }
        
        // If we still can't determine, distribute evenly to avoid all going to one route
        const orderId = order.id || order.orderId || 'unknown';
        const routeHash = orderId.toString().charCodeAt(0) % 3;
        const routes = ['rijnsburg', 'aalsmeer', 'naaldwijk'];
        const assignedRoute = routes[routeHash];
        
        // Only log warning for first few orders to avoid spam
        if (Math.random() < 0.01) { // Log 1% of orders
            console.warn('⚠️ Could not determine route for order:', {
                customer: customer || '(empty)',
                location: location || '(empty)',
                orderId: orderId
            }, `- distributing to ${assignedRoute} (hash-based)`);
        }
        
        return assignedRoute;
    }

    /**
     * Check capacity constraints for a route
     */
    checkCapacity(standardCarts, danishCarts) {
        const maxCapacity = danishCarts > BUSINESS_RULES.danishThreshold 
            ? BUSINESS_RULES.maxCartsWithDanish 
            : BUSINESS_RULES.maxStandardCarts;
        
        const totalCarts = standardCarts + danishCarts;
        const equivalentStandard = standardCarts + Math.ceil(danishCarts / BUSINESS_RULES.danishToStandardRatio);
        
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
            warning: danishCarts > BUSINESS_RULES.danishThreshold 
                ? (typeof i18n !== 'undefined' 
                    ? i18n.t('carts.danishCapacityWarning', `⚠️ More than ${BUSINESS_RULES.danishThreshold} Danish carts - capacity reduced to ${maxCapacity}`, BUSINESS_RULES.danishThreshold, maxCapacity)
                    : `⚠️ More than ${BUSINESS_RULES.danishThreshold} Danish carts - capacity reduced to ${maxCapacity}`)
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
        // Create fallback capacities
        if (typeof window !== 'undefined') {
            window.CART_CAPACITIES = {
                standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
                danish: 17
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
    // Create a minimal fallback
    const fallbackCapacities = {
        standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
        danish: 17
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
            const capacity = cartType === 'danish' ? 17 : (fallbackCapacities.standard[crateType] || 72);
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


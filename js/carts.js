/**
 * Zuidplas Logistics - Cart Assignment Logic
 * Handles cart type assignment, capacity calculations, and loading visualization
 */

class CartManager {
    constructor() {
        this.capacities = CART_CAPACITIES;
        this.danishCustomers = DANISH_CART_CUSTOMERS;
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
        const quantity = order.quantity || order.amount || 0;
        
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
        // First, group orders by client (CRITICAL REQUIREMENT)
        const ordersByClient = {};
        orders.forEach(order => {
            const clientName = order.customer || order.customerName || 'Unknown';
            if (!ordersByClient[clientName]) {
                ordersByClient[clientName] = [];
            }
            ordersByClient[clientName].push(order);
        });

        const routeCarts = {
            rijnsburg: { standard: 0, danish: 0, orders: [], clients: {} },
            aalsmeer: { standard: 0, danish: 0, orders: [], clients: {} },
            naaldwijk: { standard: 0, danish: 0, orders: [], clients: {} }
        };

        // Process each client's orders together
        Object.keys(ordersByClient).forEach(clientName => {
            const clientOrders = ordersByClient[clientName];
            
            // Assign cart type (same for all orders from same client)
            const firstOrder = clientOrders[0];
            const orderWithCart = this.assignCartType(firstOrder);
            const cartType = orderWithCart.cartType;
            
            // Calculate total carts needed for all orders from this client
            let totalCarts = 0;
            clientOrders.forEach(order => {
                const orderWithCartType = this.assignCartType(order);
                const cartCalc = this.calculateCartsNeeded(orderWithCartType);
                totalCarts += cartCalc.carts;
            });
            
            // Determine route from delivery location
            const route = this.determineRoute(firstOrder);
            
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
                
                clientOrders.forEach(order => {
                    const orderWithCartType = this.assignCartType(order);
                    const cartCalc = this.calculateCartsNeeded(orderWithCartType);
                    routeCarts[route].orders.push({
                        ...orderWithCartType,
                        cartsNeeded: cartCalc.carts,
                        cartCalculation: cartCalc,
                        clientGroup: clientName // Mark which client group this belongs to
                    });
                    routeCarts[route].clients[clientName].push({
                        ...orderWithCartType,
                        cartsNeeded: cartCalc.carts
                    });
                });
            }
        });

        return routeCarts;
    }

    /**
     * Determine route from order data
     */
    determineRoute(order) {
        const location = (order.deliveryLocation || order.location || '').toLowerCase();
        const customer = (order.customer || order.customerName || '').toLowerCase();
        
        if (location.includes('rijnsburg') || 
            ROUTES.rijnsburg.clientList.some(c => customer.includes(c.toLowerCase()))) {
            return 'rijnsburg';
        }
        
        if (location.includes('aalsmeer') || 
            ROUTES.aalsmeer.clientList.some(c => customer.includes(c.toLowerCase()))) {
            return 'aalsmeer';
        }
        
        if (location.includes('naaldwijk') || 
            ROUTES.naaldwijk.clientList.some(c => customer.includes(c.toLowerCase()))) {
            return 'naaldwijk';
        }

        // Default to aalsmeer (most common)
        return 'aalsmeer';
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

// Global instance
const cartManager = new CartManager();


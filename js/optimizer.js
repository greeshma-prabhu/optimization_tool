/**
 * Zuidplas Logistics - Route Optimization Engine
 * CORRECT BUSINESS LOGIC:
 * 1. Calculate carts needed per route
 * 2. Try to fit everything in 2 own trucks (default plan)
 * 3. Only if overflow → suggest neighbor/external truck
 */

class RouteOptimizer {
    constructor(orders, routes, trucks) {
        this.orders = orders || [];
        this.routes = routes || ROUTES;
        this.trucks = trucks || TRUCKS;
        
        // Get cartManager from multiple sources
        this.cartManager = typeof cartManager !== 'undefined' ? cartManager : 
                          (typeof window !== 'undefined' && window.cartManager ? window.cartManager : null);
        
        if (!this.cartManager) {
            console.error('❌ cartManager not available in RouteOptimizer!');
            console.error('   Creating fallback cartManager...');
            
            // Create minimal fallback
            const fallbackCapacities = {
                standard: { '612': 72, '575': 32, '902': 40, '588': 40, '996': 32, '856': 20 },
                danish: 17
            };
            
            this.cartManager = {
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
                calculateRouteCarts: (orders) => {
                    // Minimal implementation - group by customer and route
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
                        
                        // Determine route (simple hash for now)
                        const routeHash = (customerName.charCodeAt(0) || 0) % 3;
                        const routes = ['rijnsburg', 'aalsmeer', 'naaldwijk'];
                        const route = routes[routeHash];
                        
                        if (routeCarts[route]) {
                            if (cartType === 'danish') {
                                routeCarts[route].danish += cartsNeeded;
                            } else {
                                routeCarts[route].standard += cartsNeeded;
                            }
                            routeCarts[route].orders.push(...customerOrders);
                            routeCarts[route].clients[customerName] = customerOrders;
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
            
            console.warn('⚠️ Using fallback cartManager in RouteOptimizer');
        }
        
        // Truck capacities
        this.TRUCK_CAPACITY = 17; // Standard capacity
        this.TRUCK_CAPACITY_WITH_DANISH = 16; // If >6 Danish carts
        
        // Costs
        this.OWN_TRUCK_COST = (COSTS && COSTS.ownTruckPerRoute) ? COSTS.ownTruckPerRoute : 150;
        this.EXTERNAL_TRUCK_COST = (COSTS && COSTS.externalTruckPerTrip) ? COSTS.externalTruckPerTrip : 250;
        this.EXTERNAL_CARRIER_PER_CART = (COSTS && COSTS.externalCarrierPerCart) ? COSTS.externalCarrierPerCart : 25;
        this.NEIGHBOR_TRUCK_COST = 0; // Free
    }

    /**
     * Step 1: Calculate carts needed per route
     */
    processOrders() {
        if (!this.cartManager) {
            console.error('CartManager not initialized - trying to use fallback');
            // Return empty route structure if cartManager not available
            const emptyRoutes = {};
            Object.keys(this.routes).forEach(routeKey => {
                emptyRoutes[routeKey] = {
                    orders: [],
                    clients: {},
                    standard: 0,
                    danish: 0,
                    totalCarts: 0,
                    danishCarts: 0,
                    standardCarts: 0,
                    maxCapacity: this.TRUCK_CAPACITY,
                    overflow: 0,
                    fits: true,
                    utilization: 0,
                    status: 'fits',
                    routeInfo: this.routes[routeKey],
                    capacity: {
                        fits: true,
                        status: 'fits',
                        maxCapacity: this.TRUCK_CAPACITY,
                        equivalentStandard: 0,
                        utilization: 0
                    }
                };
            });
            return emptyRoutes;
        }

        // Assign cart types to all orders
        const ordersWithCarts = (this.orders || []).map(order => 
            this.cartManager.assignCartType(order)
        );

        // Calculate carts per route
        const routeCarts = this.cartManager.calculateRouteCarts(ordersWithCarts);

        // Check capacity for each route - ALWAYS return all routes
        const routeAnalysis = {};
        
        // Initialize all routes first (even if empty)
        Object.keys(this.routes).forEach(routeKey => {
            routeAnalysis[routeKey] = {
                orders: [],
                clients: {},
                standard: 0,
                danish: 0,
                totalCarts: 0,
                danishCarts: 0,
                standardCarts: 0,
                maxCapacity: this.TRUCK_CAPACITY,
                overflow: 0,
                fits: true,
                utilization: 0,
                status: 'fits',
                routeInfo: this.routes[routeKey],
                // Keep old structure for compatibility
                capacity: {
                    fits: true,
                    status: 'fits',
                    maxCapacity: this.TRUCK_CAPACITY,
                    equivalentStandard: 0,
                    utilization: 0
                }
            };
        });
        
        // Now populate with actual data
        Object.keys(routeCarts).forEach(routeKey => {
            const carts = routeCarts[routeKey];
            if (carts && routeAnalysis[routeKey]) {
                const totalCarts = (carts.standard || 0) + (carts.danish || 0);
                const danishCount = carts.danish || 0;
                
                // Determine max capacity (16 if >6 Danish, else 17)
                const maxCapacity = danishCount > 6 ? this.TRUCK_CAPACITY_WITH_DANISH : this.TRUCK_CAPACITY;
                const overflow = Math.max(0, totalCarts - maxCapacity);
                const fits = totalCarts <= maxCapacity;
                const utilization = maxCapacity > 0 ? Math.round((totalCarts / maxCapacity) * 100) : 0;
                
                routeAnalysis[routeKey] = {
                    ...carts,
                    orders: carts.orders || [],
                    clients: carts.clients || {},
                    totalCarts: totalCarts,
                    danishCarts: danishCount,
                    standardCarts: carts.standard || 0,
                    maxCapacity: maxCapacity,
                    overflow: overflow,
                    fits: fits,
                    utilization: utilization,
                    status: fits ? 'fits' : 'overflow',
                    routeInfo: this.routes[routeKey],
                    // Keep old structure for compatibility
                    capacity: {
                        fits: fits,
                        status: fits ? 'fits' : (utilization >= 90 ? 'tight' : 'overflow'),
                        maxCapacity: maxCapacity,
                        equivalentStandard: totalCarts,
                        utilization: utilization,
                        overflow: overflow
                    }
                };
            }
        });

        return routeAnalysis;
    }

    /**
     * Step 2: Check if we have overflow
     */
    checkOverflow(routeAnalysis) {
        const overflows = [];
        if (!routeAnalysis) {
            console.warn('routeAnalysis is undefined in checkOverflow');
            return overflows;
        }
        
        Object.keys(routeAnalysis).forEach(routeKey => {
            const analysis = routeAnalysis[routeKey];
            if (analysis && analysis.fits === false && analysis.overflow > 0) {
                overflows.push({
                    route: routeKey,
                    routeName: analysis.routeInfo ? analysis.routeInfo.name : routeKey,
                    overflow: analysis.overflow || 0,
                    totalCarts: analysis.totalCarts || 0,
                    maxCapacity: analysis.maxCapacity || this.TRUCK_CAPACITY
                });
            }
        });
        return overflows;
    }

    /**
     * Step 3: Generate solutions based on overflow status
     */
    generateOptions() {
        try {
            const routeAnalysis = this.processOrders();
            const overflows = this.checkOverflow(routeAnalysis);
            const options = [];

            // SCENARIO A: Everything fits in 2 own trucks (NORMAL CASE)
            if (overflows.length === 0) {
                // Default plan: Truck 1 does Route 1 (9 AM) then Route 3 (11 AM), Truck 2 does Route 2 (10 AM)
                const defaultOption = this.generateDefaultOption(routeAnalysis);
                if (defaultOption) options.push(defaultOption);

                // Optional: Neighbor's truck for Route 1 (if Route 1 fits)
                if (routeAnalysis.rijnsburg && routeAnalysis.rijnsburg.fits) {
                    const neighborOption = this.generateNeighborOption(routeAnalysis);
                    if (neighborOption) options.push(neighborOption);
                }
            } else {
                // SCENARIO B/C: Overflow detected - show solutions
                const overflowSolutions = this.generateOverflowSolutions(routeAnalysis, overflows);
                options.push(...overflowSolutions);
            }

            // Calculate scores
            options.forEach(option => {
                if (option) {
                    option.score = this.calculateOptimizationScore(option, routeAnalysis, options);
                }
            });

            // Sort by score (highest first), then by cost (lowest first)
            options.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.cost - b.cost;
            });

            // Mark first option as recommended
            if (options.length > 0) {
                options[0].recommended = true;
            }

            return options;
        } catch (error) {
            console.error('Error generating options:', error);
            return [];
        }
    }

    /**
     * Default option: Everything fits, use 2 own trucks
     */
    generateDefaultOption(routeAnalysis) {
        try {
            const route1 = routeAnalysis.rijnsburg;
            const route2 = routeAnalysis.aalsmeer;
            const route3 = routeAnalysis.naaldwijk;

            if (!route1 || !route2 || !route3) {
                return null;
            }

            // Total cost: Route 1 (€150) + Route 2 (€150) + Route 3 (€150) = €450
            // Even though Truck 1 does both Route 1 and Route 3, each route is a separate trip with costs
            const cost = this.OWN_TRUCK_COST * 3; // 3 routes = 3 trips (even if same truck does 2 routes)

            return {
                id: 'default',
                name: typeof i18n !== 'undefined' ? i18n.t('optimization.standardAllocation', 'Standard Allocation') : 'Standard Allocation',
                description: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.defaultDescription', 'All carts fit in 2 own trucks - Truck 1 does Route 1 then Route 3, Truck 2 does Route 2') :
                    'All carts fit in 2 own trucks - Truck 1 does Route 1 then Route 3, Truck 2 does Route 2',
                allocation: {
                    route1: {
                        truck: 'own-truck-1',
                        route: 'rijnsburg',
                        departure: '09:00',
                        returnTime: '10:30',
                        carts: route1.totalCarts,
                        cost: this.OWN_TRUCK_COST
                    },
                    route2: {
                        truck: 'own-truck-2',
                        route: 'aalsmeer',
                        departure: '10:00',
                        carts: route2.totalCarts,
                        cost: this.OWN_TRUCK_COST
                    },
                    route3: {
                        truck: 'own-truck-1',
                        route: 'naaldwijk',
                        departure: '11:00',
                        carts: route3.totalCarts,
                        cost: this.OWN_TRUCK_COST, // Separate trip - fuel, driver time, etc.
                        note: 'Truck 1 returns from Route 1'
                    }
                },
                cost: cost,
                feasibility: {
                    fits: true,
                    status: 'fits',
                    message: typeof i18n !== 'undefined' ? i18n.t('optimization.allRoutesFit', 'All routes fit within capacity') : 'All routes fit within capacity'
                },
                recommended: true,
                pros: typeof i18n !== 'undefined' ? [
                    i18n.t('data.usesOwnTrucks'),
                    i18n.t('data.lowestCost'),
                    i18n.t('data.efficientTruckUtilization')
                ] : ['Uses own trucks', 'Lowest cost', 'Efficient truck utilization'],
                cons: typeof i18n !== 'undefined' ? [
                    i18n.t('data.tightTiming'),
                    i18n.t('data.noBuffer')
                ] : ['Tight timing if Route 1 delayed', 'No buffer for delays'],
                score: 0
            };
        } catch (error) {
            console.error('Error generating default option:', error);
            return null;
        }
    }

    /**
     * Neighbor's truck option (only if no overflow)
     */
    generateNeighborOption(routeAnalysis) {
        try {
            const route1 = routeAnalysis.rijnsburg;
            const route2 = routeAnalysis.aalsmeer;
            const route3 = routeAnalysis.naaldwijk;

            if (!route1 || !route2 || !route3 || !route1.fits) {
                return null; // Only show if Route 1 fits
            }

            const cost = this.OWN_TRUCK_COST * 2; // 2 own trucks for Routes 2 & 3

            return {
                id: 'neighbor',
                name: typeof i18n !== 'undefined' ? i18n.t('optimization.neighborTruck', "Neighbor's Truck") : "Neighbor's Truck",
                description: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.neighborDescription', "Use neighbor's truck for Route 1 (free), own trucks for Routes 2 & 3") :
                    "Use neighbor's truck for Route 1 (free), own trucks for Routes 2 & 3",
                allocation: {
                    route1: {
                        truck: 'neighbor-truck',
                        route: 'rijnsburg',
                        departure: '09:00',
                        carts: route1.totalCarts,
                        cost: 0,
                        requiresAction: typeof i18n !== 'undefined' ? i18n.t('optimization.callNeighbor', '📞 Call neighbor to confirm availability') : '📞 Call neighbor to confirm availability'
                    },
                    route2: {
                        truck: 'own-truck-2',
                        route: 'aalsmeer',
                        departure: '10:00',
                        carts: route2.totalCarts,
                        cost: this.OWN_TRUCK_COST
                    },
                    route3: {
                        truck: 'own-truck-1',
                        route: 'naaldwijk',
                        departure: '11:00',
                        carts: route3.totalCarts,
                        cost: this.OWN_TRUCK_COST
                    }
                },
                cost: cost,
                feasibility: {
                    fits: true,
                    status: 'needs_check',
                    message: typeof i18n !== 'undefined' ? i18n.t('optimization.callNeighbor', '📞 Call neighbor to confirm availability') : '📞 Call neighbor to confirm availability'
                },
                recommended: false,
                requiresAction: typeof i18n !== 'undefined' ? i18n.t('optimization.callNeighbor', 'Call Neighbor') : 'Call Neighbor',
                pros: typeof i18n !== 'undefined' ? [
                    i18n.t('data.freeTruck'),
                    i18n.t('data.reliablePartner'),
                    i18n.t('data.lowestTotalCost')
                ] : ['Free truck', 'Reliable partner', 'Lowest total cost'],
                cons: typeof i18n !== 'undefined' ? [
                    i18n.t('data.dependsOnAvailability'),
                    i18n.t('data.requiresManualConfirmation')
                ] : ['Depends on availability', 'Requires manual confirmation'],
                score: 0
            };
        } catch (error) {
            console.error('Error generating neighbor option:', error);
            return null;
        }
    }

    /**
     * Generate overflow handling solutions
     */
    generateOverflowSolutions(routeAnalysis, overflows) {
        const solutions = [];

        // For each overflow route, generate solutions
        overflows.forEach(overflow => {
            const route = routeAnalysis[overflow.route];
            const routeName = route.routeInfo.name;
            const overflowCarts = overflow.overflow;

            // Solution 1: External carrier for overflow carts (BEST)
            solutions.push({
                id: `overflow_carrier_${overflow.route}`,
                name: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.overflowCarrier', 'Overflow via External Carrier') : 
                    'Overflow via External Carrier',
                description: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.overflowCarrierDescription', `Route ${route.routeInfo.id} (${routeName}): ${overflowCarts} carts via external carrier, rest in own truck`, route.routeInfo.id, routeName, overflowCarts) :
                    `Route ${route.routeInfo.id} (${routeName}): ${overflowCarts} carts via external carrier, rest in own truck`,
                allocation: this.calculateOverflowAllocation(routeAnalysis, overflow, 'carrier'),
                cost: (this.OWN_TRUCK_COST * 3) + (overflowCarts * this.EXTERNAL_CARRIER_PER_CART), // 3 routes = 3 trips
                feasibility: {
                    fits: true,
                    status: 'overflow_handled',
                    message: typeof i18n !== 'undefined' ? 
                        i18n.t('optimization.overflowHandled', `${overflowCarts} overflow carts handled via external carrier`, overflowCarts) :
                        `${overflowCarts} overflow carts handled via external carrier`
                },
                recommended: true, // Best overflow solution
                pros: typeof i18n !== 'undefined' ? [
                    i18n.t('optimization.minimalExtraCost', 'Minimal extra cost'),
                    i18n.t('optimization.usesOwnTrucks', 'Uses own trucks efficiently'),
                    i18n.t('optimization.guaranteedCapacity', 'Guaranteed capacity')
                ] : ['Minimal extra cost', 'Uses own trucks efficiently', 'Guaranteed capacity'],
                cons: typeof i18n !== 'undefined' ? [
                    i18n.t('optimization.requiresExternalBooking', 'Requires external carrier booking'),
                    i18n.t('optimization.splitDelivery', 'Split delivery for overflow route')
                ] : ['Requires external carrier booking', 'Split delivery for overflow route'],
                score: 0,
                overflow: true
            });

            // Solution 2: External truck for entire overflow route
            solutions.push({
                id: `overflow_truck_${overflow.route}`,
                name: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.externalTruckForRoute', 'External Truck for Overflow Route') : 
                    'External Truck for Overflow Route',
                description: typeof i18n !== 'undefined' ? 
                    i18n.t('optimization.externalTruckDescription', `Use external truck for entire Route ${route.routeInfo.id} (${routeName})`, route.routeInfo.id, routeName) :
                    `Use external truck for entire Route ${route.routeInfo.id} (${routeName})`,
                allocation: this.calculateOverflowAllocation(routeAnalysis, overflow, 'truck'),
                cost: (this.OWN_TRUCK_COST * 2) + this.EXTERNAL_TRUCK_COST, // 2 own truck routes + 1 external truck route
                feasibility: {
                    fits: true,
                    status: 'overflow_handled',
                    message: typeof i18n !== 'undefined' ? 
                        i18n.t('optimization.fullRouteExternal', 'Full route handled by external truck') :
                        'Full route handled by external truck'
                },
                recommended: false,
                pros: typeof i18n !== 'undefined' ? [
                    i18n.t('optimization.simpleSolution', 'Simple solution'),
                    i18n.t('optimization.guaranteedCapacity', 'Guaranteed capacity'),
                    i18n.t('optimization.noSplitDelivery', 'No split delivery')
                ] : ['Simple solution', 'Guaranteed capacity', 'No split delivery'],
                cons: typeof i18n !== 'undefined' ? [
                    i18n.t('data.higherCost'),
                    i18n.t('data.externalDependency')
                ] : ['Higher cost', 'External dependency'],
                score: 0,
                overflow: true
            });
        });

        return solutions;
    }

    /**
     * Calculate allocation for overflow scenarios
     */
    calculateOverflowAllocation(routeAnalysis, overflow, solutionType) {
        const route1 = routeAnalysis.rijnsburg;
        const route2 = routeAnalysis.aalsmeer;
        const route3 = routeAnalysis.naaldwijk;
        const overflowRoute = routeAnalysis[overflow.route];

        const allocation = {};

        // Default plan: Truck 1 does Route 1 + Route 3, Truck 2 does Route 2
        // But adjust based on which route has overflow

        if (overflow.route === 'rijnsburg') {
            // Route 1 overflow
            if (solutionType === 'carrier') {
                allocation.route1 = {
                    truck: 'own-truck-1',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: overflowRoute.maxCapacity,
                    externalCarrier: overflow.overflow,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'own-truck-2',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: route2.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'own-truck-1',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: route3.totalCarts,
                    cost: this.OWN_TRUCK_COST // Separate trip - fuel, driver time, etc.
                };
            } else {
                // External truck for Route 1
                allocation.route1 = {
                    truck: 'external-truck',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: overflowRoute.totalCarts,
                    cost: this.EXTERNAL_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'own-truck-2',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: route2.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'own-truck-1',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: route3.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
            }
        } else if (overflow.route === 'aalsmeer') {
            // Route 2 overflow
            if (solutionType === 'carrier') {
                allocation.route1 = {
                    truck: 'own-truck-1',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: route1.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'own-truck-2',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: overflowRoute.maxCapacity,
                    externalCarrier: overflow.overflow,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'own-truck-1',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: route3.totalCarts,
                    cost: this.OWN_TRUCK_COST // Separate trip - fuel, driver time, etc.
                };
            } else {
                // External truck for Route 2
                allocation.route1 = {
                    truck: 'own-truck-1',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: route1.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'external-truck',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: overflowRoute.totalCarts,
                    cost: this.EXTERNAL_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'own-truck-1',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: route3.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
            }
        } else if (overflow.route === 'naaldwijk') {
            // Route 3 overflow
            if (solutionType === 'carrier') {
                allocation.route1 = {
                    truck: 'own-truck-1',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: route1.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'own-truck-2',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: route2.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'own-truck-1',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: overflowRoute.maxCapacity,
                    externalCarrier: overflow.overflow,
                    cost: this.OWN_TRUCK_COST // Separate trip - fuel, driver time, etc.
                };
            } else {
                // External truck for Route 3
                allocation.route1 = {
                    truck: 'own-truck-1',
                    route: 'rijnsburg',
                    departure: '09:00',
                    carts: route1.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route2 = {
                    truck: 'own-truck-2',
                    route: 'aalsmeer',
                    departure: '10:00',
                    carts: route2.totalCarts,
                    cost: this.OWN_TRUCK_COST
                };
                allocation.route3 = {
                    truck: 'external-truck',
                    route: 'naaldwijk',
                    departure: '11:00',
                    carts: overflowRoute.totalCarts,
                    cost: this.EXTERNAL_TRUCK_COST
                };
            }
        }

        return allocation;
    }

    /**
     * Calculate optimization score (0-100)
     */
    calculateOptimizationScore(option, routeAnalysis, allOptions = null) {
        if (!option) return 0;
        
        let score = 100;

        // Cost factor (lower is better) - 30 points
        const optionsForComparison = (allOptions && Array.isArray(allOptions)) ? allOptions : [option];
        const validOptions = optionsForComparison.filter(o => o && typeof o.cost === 'number');
        
        if (validOptions.length > 0) {
            const minCost = Math.min(...validOptions.map(o => o.cost));
            const optionCost = typeof option.cost === 'number' ? option.cost : 0;
            
            if (minCost > 0) {
                const costFactor = (optionCost / minCost) * 30;
                score -= (costFactor - 30);
            }
        }

        // Feasibility factor (30 points)
        if (option.feasibility && typeof option.feasibility.fits === 'boolean') {
            if (option.feasibility.fits) {
                score += 30;
            } else {
                score -= 20;
            }
        }

        // Efficiency factor (20 points)
        if (option.recommended === true) {
            score += 20;
        }

        // Reliability factor (20 points)
        if (option.requiresAction) {
            score -= 10; // Penalty for manual action needed
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Get best option
     */
    getBestOption() {
        const options = this.generateOptions();
        return options.length > 0 ? options[0] : null;
    }
}

// Global instance (will be initialized with orders)
let routeOptimizer = null;

function initializeOptimizer(orders) {
    routeOptimizer = new RouteOptimizer(orders, ROUTES, TRUCKS);
    return routeOptimizer;
}

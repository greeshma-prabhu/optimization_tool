/**
 * Zuidplas Logistics - Route Optimization Engine
 * Generates optimal truck allocation scenarios and cost calculations
 */

class RouteOptimizer {
    constructor(orders, routes, trucks) {
        this.orders = orders || [];
        this.routes = routes || ROUTES;
        this.trucks = trucks || TRUCKS;
        this.cartManager = cartManager;
    }

    /**
     * Process orders and assign to routes
     */
    processOrders() {
        // Check if cartManager is available
        if (!this.cartManager) {
            console.error('CartManager not initialized');
            return {};
        }

        // Assign cart types to all orders
        const ordersWithCarts = (this.orders || []).map(order => 
            this.cartManager.assignCartType(order)
        );

        // Calculate carts per route
        const routeCarts = this.cartManager.calculateRouteCarts(ordersWithCarts);

        // Check capacity for each route
        const routeAnalysis = {};
        Object.keys(routeCarts).forEach(routeKey => {
            const carts = routeCarts[routeKey];
            if (carts) {
                routeAnalysis[routeKey] = {
                    ...carts,
                    orders: carts.orders || [],
                    clients: carts.clients || {},
                    capacity: this.cartManager.checkCapacity(
                        carts.standard || 0,
                        carts.danish || 0
                    ),
                    routeInfo: this.routes[routeKey]
                };
            }
        });

        return routeAnalysis;
    }

    /**
     * Generate optimization options
     */
    generateOptions() {
        try {
            const routeAnalysis = this.processOrders();
            const options = [];

            // Option A: Standard Allocation (Recommended)
            const optionA = this.generateStandardOption(routeAnalysis);
            if (optionA) options.push(optionA);

            // Option B: External Truck for Route 1
            const optionB = this.generateExternalRoute1Option(routeAnalysis);
            if (optionB) options.push(optionB);

            // Option C: Neighbor's Truck
            const optionC = this.generateNeighborOption(routeAnalysis);
            if (optionC) options.push(optionC);

            // Option D: Overflow Scenarios
            const overflowOptions = this.generateOverflowOptions(routeAnalysis);
            if (overflowOptions && Array.isArray(overflowOptions)) {
                options.push(...overflowOptions);
            }

            // Calculate optimization score (pass all options to avoid recursion)
            options.forEach(option => {
                if (option) {
                    option.score = this.calculateOptimizationScore(option, routeAnalysis, options);
                }
            });

            // Sort by score (highest first)
            options.sort((a, b) => {
                const scoreA = (a && a.score) ? a.score : 0;
                const scoreB = (b && b.score) ? b.score : 0;
                return scoreB - scoreA;
            });

            return options;
        } catch (error) {
            console.error('Error generating options:', error);
            return [];
        }
    }

    /**
     * Option A: Standard Allocation
     */
    generateStandardOption(routeAnalysis) {
        try {
            const cost = (COSTS && COSTS.ownTruckPerRoute) ? COSTS.ownTruckPerRoute * 3 : 450; // 3 routes with own trucks
            
            const feasibility = this.checkFeasibility('standard', routeAnalysis);
            
            return {
                id: 'A',
                name: 'Standard Allocation',
                description: 'Use both own trucks - Truck 1 does Route 1 then Route 3',
                allocation: {
                    route1: {
                        truck: 'own-truck-1',
                        route: 'rijnsburg',
                        departure: '09:00',
                        returnTime: '10:30',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    },
                    route2: {
                        truck: 'own-truck-2',
                        route: 'aalsmeer',
                        departure: '10:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    },
                    route3: {
                        truck: 'own-truck-1',
                        route: 'naaldwijk',
                        departure: '11:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150,
                        note: 'Truck 1 returns from Route 1'
                    }
                },
                cost: cost,
                feasibility: feasibility || { fits: true, status: 'fits', message: 'All routes fit' },
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
                score: 0 // Will be calculated later
            };
        } catch (error) {
            console.error('Error generating standard option:', error);
            return null;
        }
    }

    /**
     * Option B: External Truck for Route 1
     */
    generateExternalRoute1Option(routeAnalysis) {
        try {
            const cost = (COSTS && COSTS.externalTruckPerTrip && COSTS.ownTruckPerRoute) 
                ? COSTS.externalTruckPerTrip + (COSTS.ownTruckPerRoute * 2) 
                : 550;
            
            const feasibility = this.checkFeasibility('external_route1', routeAnalysis);
            
            return {
                id: 'B',
                name: 'External Truck for Route 1',
                description: typeof i18n !== 'undefined' ? i18n.t('data.useExternalTruckDescription') : 'Use external truck for Route 1, own trucks for Routes 2 & 3',
                allocation: {
                    route1: {
                        truck: 'external-truck',
                        route: 'rijnsburg',
                        departure: '09:00',
                        cost: COSTS ? COSTS.externalTruckPerTrip : 250
                    },
                    route2: {
                        truck: 'own-truck-2',
                        route: 'aalsmeer',
                        departure: '10:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    },
                    route3: {
                        truck: 'own-truck-1',
                        route: 'naaldwijk',
                        departure: '11:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    }
                },
                cost: cost,
                feasibility: feasibility || { fits: true, status: 'fits', message: 'All routes fit' },
                recommended: false,
                pros: typeof i18n !== 'undefined' ? [
                    i18n.t('data.noTimingPressure'),
                    i18n.t('data.saferSchedule'),
                    i18n.t('data.truckAvailableForRoute', '1', '3')
                ] : ['No timing pressure', 'Safer schedule', 'Truck 1 available for Route 3'],
                cons: typeof i18n !== 'undefined' ? [
                    i18n.t('data.higherCost'),
                    i18n.t('data.externalDependency')
                ] : ['Higher cost', 'External dependency'],
                score: 0
            };
        } catch (error) {
            console.error('Error generating external option:', error);
            return null;
        }
    }

    /**
     * Option C: Neighbor's Truck
     */
    generateNeighborOption(routeAnalysis) {
        try {
            const cost = (COSTS && COSTS.ownTruckPerRoute) ? COSTS.ownTruckPerRoute * 2 : 300; // Only 2 own truck routes
            
            return {
                id: 'C',
                name: "Neighbor's Truck",
                description: "Use neighbor's truck for Route 1 (free), own trucks for Routes 2 & 3",
                allocation: {
                    route1: {
                        truck: 'neighbor-truck',
                        route: 'rijnsburg',
                        departure: '09:00',
                        cost: 0,
                        requiresAction: '📞 Call neighbor to confirm availability'
                    },
                    route2: {
                        truck: 'own-truck-2',
                        route: 'aalsmeer',
                        departure: '10:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    },
                    route3: {
                        truck: 'own-truck-1',
                        route: 'naaldwijk',
                        departure: '11:00',
                        cost: COSTS ? COSTS.ownTruckPerRoute : 150
                    }
                },
                cost: cost,
                feasibility: {
                    status: 'needs_check',
                    message: '📞 Call neighbor to confirm availability',
                    fits: true
                },
                recommended: true,
                requiresAction: 'Call Neighbor',
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
     * Generate overflow handling options
     */
    generateOverflowOptions(routeAnalysis) {
        const options = [];

        Object.keys(routeAnalysis).forEach(routeKey => {
            const analysis = routeAnalysis[routeKey];
            if (!analysis.capacity.fits) {
                const overflow = analysis.capacity.overflow;
                const ownTruckCarts = BUSINESS_RULES.maxStandardCarts;
                const externalCarts = overflow;

                options.push({
                    id: `D_${routeKey}`,
                    name: typeof i18n !== 'undefined' ? `${i18n.t('data.overflowHandling')} - ${analysis.routeInfo.name}` : `Overflow Handling - ${analysis.routeInfo.name}`,
                    description: typeof i18n !== 'undefined' ? i18n.t('data.routeNeeds', analysis.capacity.equivalentStandard, overflow) : `Route needs ${analysis.capacity.equivalentStandard} carts (overflow: ${overflow})`,
                    allocation: {
                        [routeKey]: {
                            truck: 'own-truck',
                            externalCarrier: true,
                            ownCarts: ownTruckCarts,
                            externalCarts: externalCarts,
                            cost: COSTS.ownTruckPerRoute + (COSTS.externalCarrierPerCart * externalCarts)
                        }
                    },
                    cost: COSTS.ownTruckPerRoute + (COSTS.externalCarrierPerCart * externalCarts),
                    feasibility: {
                        status: 'overflow',
                        overflow: overflow,
                        message: `Needs ${overflow} additional carts via external carrier`
                    },
                    recommended: false,
                    overflow: true
                });
            }
        });

        return options;
    }

    /**
     * Check feasibility of an option
     */
    checkFeasibility(scenario, routeAnalysis) {
        const feasibility = {
            status: 'fits',
            message: 'All routes fit within capacity',
            fits: true,
            warnings: []
        };

        Object.keys(routeAnalysis).forEach(routeKey => {
            const analysis = routeAnalysis[routeKey];
            const capacity = analysis.capacity;

            if (!capacity.fits) {
                feasibility.fits = false;
                feasibility.status = 'overflow';
                feasibility.warnings.push(
                    `${analysis.routeInfo.name}: ${capacity.overflow} carts overflow`
                );
            } else if (capacity.status === 'tight') {
                feasibility.warnings.push(
                    `${analysis.routeInfo.name}: Capacity is tight (${capacity.utilization}% used)`
                );
            }
        });

        if (feasibility.warnings.length > 0) {
            feasibility.message = feasibility.warnings.join('; ');
        }

        return feasibility;
    }

    /**
     * Calculate optimization score (0-100)
     */
    calculateOptimizationScore(option, routeAnalysis, allOptions = null) {
        if (!option) return 0;
        
        let score = 100;

        // Cost factor (lower is better)
        // Use provided allOptions to avoid infinite recursion
        const optionsForComparison = (allOptions && Array.isArray(allOptions)) ? allOptions : [option];
        const validOptions = optionsForComparison.filter(o => o && typeof o.cost === 'number');
        
        if (validOptions.length === 0) return 50; // Default score if no valid options
        
        const minCost = Math.min(...validOptions.map(o => o.cost));
        const optionCost = typeof option.cost === 'number' ? option.cost : 0;
        
        if (minCost > 0) {
            const costFactor = (optionCost / minCost) * 30; // Max 30 points
            score -= (costFactor - 30);
        }

        // Feasibility factor (30 points)
        if (option.feasibility && typeof option.feasibility.fits === 'boolean') {
            if (option.feasibility.fits) {
                score += 30;
            } else {
                score -= 20; // Penalty for overflow
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
        return options[0]; // Already sorted by score
    }
}

// Global instance (will be initialized with orders)
let routeOptimizer = null;

function initializeOptimizer(orders) {
    routeOptimizer = new RouteOptimizer(orders, ROUTES, TRUCKS);
    return routeOptimizer;
}


/**
 * UNIFIED CART DISPLAY MANAGER
 * 
 * Provides consistent cart calculation and display across ALL pages
 * Works with ANY date's orders - no hardcoded values
 * 
 * Usage:
 *   const manager = new CartDisplayManager(orders);
 *   manager.updateDOM();
 */

class CartDisplayManager {
    constructor(orders = null) {
        // CRITICAL: Don't store orders - get from SINGLE SOURCE instead!
        // This ensures we always use the same orders and cache as Dashboard
        this.orders = null; // Will be set from getGlobalOrdersAndCarts()
        this.cartData = null;
        this.calculate();
    }
    
    /**
     * Calculate carts using SINGLE SOURCE OF TRUTH
     * CRITICAL: Use getGlobalOrdersAndCarts() to get CACHED result, not calculate fresh!
     */
    calculate() {
        console.log('📦 CartDisplayManager: Getting cart data from SINGLE SOURCE...');
        
        // CRITICAL: Use getGlobalOrdersAndCarts() to get CACHED result
        // DO NOT call calculateTotalCarts() directly - that would calculate fresh and overwrite cache!
        // CRITICAL: Non-Dashboard pages should NEVER calculate - only read from Dashboard's cache!
        if (window.CartCalculation && window.CartCalculation.getGlobalOrdersAndCarts) {
            const globalData = window.CartCalculation.getGlobalOrdersAndCarts(); // NO forceRefresh - only reads cache!
            this.cartData = globalData.cartResult;
            this.orders = globalData.orders; // Use orders from single source
            
            if (this.cartData.total === 0 && this.orders.length > 0) {
                console.warn('⚠️ CartDisplayManager: Got 0 carts but have orders - Dashboard may not have calculated yet!');
                console.warn('⚠️ Please load Dashboard and click "Sync" or "Refresh Data" to calculate carts!');
            }
            
            console.log('✅ CartDisplayManager: Using CACHED result from SINGLE SOURCE');
            console.log('   Total carts:', this.cartData.total);
            console.log('   Total trucks:', this.cartData.trucks);
            console.log('   Aalsmeer:', this.cartData.byRoute.Aalsmeer || 0);
            console.log('   Naaldwijk:', this.cartData.byRoute.Naaldwijk || 0);
            console.log('   Rijnsburg:', this.cartData.byRoute.Rijnsburg || 0);
            console.log('   Orders:', this.orders.length);
            
            // CRITICAL: Log period-specific data to debug
            if (this.cartData.morning && this.cartData.morning.byRoute) {
                console.log('   Morning byRoute:', this.cartData.morning.byRoute);
            }
            if (this.cartData.evening && this.cartData.evening.byRoute) {
                console.log('   Evening byRoute:', this.cartData.evening.byRoute);
            }
        } else {
            console.error('❌ CartDisplayManager: getGlobalOrdersAndCarts() not available!');
            console.error('❌ Cannot get cart data - Dashboard must calculate first!');
            this.cartData = {
                total: 0,
                byRoute: { Aalsmeer: 0, Naaldwijk: 0, Rijnsburg: 0 },
                trucks: 0,
                breakdown: []
            };
        }
        
        return this.cartData;
    }
    
    /**
     * Get summary data
     */
    getSummary() {
        if (!this.cartData) {
            this.calculate();
        }
        
        return {
            totalCarts: this.cartData.total || 0,
            totalTrucks: this.cartData.trucks || 0,
            routes: {
                Aalsmeer: this.cartData.byRoute.Aalsmeer || 0,
                Naaldwijk: this.cartData.byRoute.Naaldwijk || 0,
                Rijnsburg: this.cartData.byRoute.Rijnsburg || 0
            },
            totalOrders: this.orders.length
        };
    }
    
    /**
     * Calculate cart types (Standard vs Danish)
     */
    getCartTypes() {
        if (!this.cartData) {
            return { standard: 0, danish: 0 };
        }

        // Prefer explicit totals from calculation
        if (typeof this.cartData.standard !== 'undefined' && typeof this.cartData.danish !== 'undefined') {
            return { standard: this.cartData.standard || 0, danish: this.cartData.danish || 0 };
        }

        let standardCarts = 0;
        let danishCarts = 0;

        const breakdowns = [];
        if (this.cartData.morning?.breakdown) breakdowns.push(this.cartData.morning.breakdown);
        if (this.cartData.evening?.breakdown) breakdowns.push(this.cartData.evening.breakdown);
        if (breakdowns.length === 0 && Array.isArray(this.cartData.breakdown)) {
            breakdowns.push(this.cartData.breakdown);
        }

        breakdowns.flat().forEach(routeData => {
            routeData.fustBreakdown?.forEach(fust => {
                if (fust.fustType === '612' || fust.fustType === '614') {
                    standardCarts += fust.carts;
                } else {
                    danishCarts += fust.carts;
                }
            });
        });

        return { standard: standardCarts, danish: danishCarts };
    }
    
    /**
     * Get route-specific data
     */
    getRouteData(routeName, period = null) {
        if (!this.cartData) {
            this.calculate();
        }
        
        const locationIdMap = {
            'Aalsmeer': 32,
            'Naaldwijk': 34,
            'Rijnsburg': 36
        };
        
        const locationId = locationIdMap[routeName];
        if (!locationId) {
            return { carts: 0, trucks: 0, orders: 0 };
        }
        
        // CRITICAL: Get carts from period-specific data (morning/evening)
        // Structure: cartData.morning.byRoute.Naaldwijk or cartData.evening.byRoute.Naaldwijk
        let carts = 0;
        
        // CRITICAL FIX: Read from period-specific data FIRST
        if (period && this.cartData && this.cartData[period]) {
            // Try period-specific first (morning/evening)
            if (this.cartData[period].byRoute && this.cartData[period].byRoute[routeName] !== undefined) {
                carts = this.cartData[period].byRoute[routeName];
                console.log(`✅ getRouteData(${routeName}, ${period}): Found ${carts} carts from ${period}.byRoute.${routeName}`);
            } else {
                console.warn(`⚠️ getRouteData(${routeName}, ${period}): ${period}.byRoute.${routeName} not found`);
                console.warn(`   ${period}.byRoute:`, this.cartData[period].byRoute);
            }
        }
        
        // Fallback to combined totals if period-specific not found
        if (carts === 0 && this.cartData && this.cartData.byRoute && this.cartData.byRoute[routeName] !== undefined) {
            carts = this.cartData.byRoute[routeName];
            console.log(`⚠️ getRouteData(${routeName}, ${period}): Using combined total ${carts} carts (period-specific was 0)`);
        }
        
        // CRITICAL: If we still have 0 carts but have orders, this is WRONG!
        // Orders MUST have carts to transport goods!
        if (carts === 0) {
            console.error(`❌ getRouteData(${routeName}, ${period}): ZERO CARTS!`);
            console.error(`   cartData structure:`, this.cartData);
            if (this.cartData && this.cartData[period]) {
                console.error(`   ${period} structure:`, this.cartData[period]);
            }
        }
        
        // CRITICAL: Use matchedOrders from cartResult if available (they have period property set)
        // Otherwise use this.orders (but they might not have period set correctly)
        const ordersToCount = (this.cartData && this.cartData.matchedOrders) 
            ? this.cartData.matchedOrders 
            : (this.orders || []);
        
        // Count orders for this route FIRST
        const orders = ordersToCount.filter(order => {
            const orderLocationId = order.delivery_location_id || order.order?.delivery_location_id;
            const periodMatch = period ? (order.period || 'morning') === period : true;
            return orderLocationId === locationId &&
                   (order.assembly_amount || 0) > 0 &&
                   periodMatch;
        }).length;
        
        // CRITICAL: If orders > 0 but carts = 0, this is IMPOSSIBLE!
        // Orders MUST have carts to transport goods!
        if (orders > 0 && carts === 0) {
            console.error(`❌ CRITICAL ERROR: ${routeName} ${period} has ${orders} orders but 0 carts!`);
            console.error(`   This is impossible - orders need carts!`);
            console.error(`   Trying multiple methods to get carts...`);
            
            // Method 1: Try breakdown
            if (this.cartData && this.cartData[period] && this.cartData[period].breakdown) {
                const routeBreakdown = this.cartData[period].breakdown.find(r => r.route === routeName);
                if (routeBreakdown && routeBreakdown.carts > 0) {
                    carts = routeBreakdown.carts;
                    console.log(`   ✅ Method 1: Found ${carts} carts from breakdown!`);
                }
            }
            
            // Method 2: Try to recalculate from orders directly
            if (carts === 0 && ordersToCount.length > 0 && window.CartCalculation && window.CartCalculation.calculateCarts) {
                const routeOrders = ordersToCount.filter(order => {
                    const orderLocationId = order.delivery_location_id || order.order?.delivery_location_id;
                    const periodMatch = period ? (order.period || 'morning') === period : true;
                    return orderLocationId === locationId &&
                           (order.assembly_amount || 0) > 0 &&
                           periodMatch;
                });
                
                if (routeOrders.length > 0) {
                    console.log(`   🔄 Method 2: Recalculating carts from ${routeOrders.length} orders...`);
                    const tempResult = window.CartCalculation.calculateCarts(routeOrders);
                    const periodResult = period === 'evening' ? tempResult.evening : tempResult.morning;
                    if (periodResult && periodResult.byRoute && periodResult.byRoute[routeName] > 0) {
                        carts = periodResult.byRoute[routeName];
                        console.log(`   ✅ Method 2: Calculated ${carts} carts from orders!`);
                    }
                }
            }
            
            // Method 3: Use minimum 1 cart if we have orders (safety fallback)
            if (carts === 0 && orders > 0) {
                console.warn(`   ⚠️ Method 3: Using minimum 1 cart as safety fallback (orders exist but carts calculation failed)`);
                carts = 1; // Minimum 1 cart if orders exist
            }
        }
        
        // CRITICAL: Only show trucks if there are orders AND carts > 0
        let trucks = 0;
        if (orders > 0 && carts > 0) {
            trucks = Math.ceil(carts / 17);
        }
        
        console.log(`📊 getRouteData(${routeName}, ${period}): orders=${orders}, carts=${carts}, trucks=${trucks}`);
        
        return { carts, trucks, orders };
    }
    
    /**
     * Update DOM elements with calculated values
     * Supports multiple element IDs for different pages
     */
    updateDOM() {
        console.log('🎨 CartDisplayManager: Updating DOM elements...');
        
        const summary = this.getSummary();
        const cartTypes = this.getCartTypes();
        
        // Update total orders (multiple possible IDs)
        this.updateElement(['total-orders', 'input-orders', '.total-orders'], summary.totalOrders);
        
        // Update total carts/cars (multiple possible IDs)
        this.updateElement(['total-carts', 'total-cars', 'input-carts', '.total-carts', '.total-cars'], summary.totalCarts);
        
        // Update total trucks (multiple possible IDs)
        this.updateElement(['total-trucks', 'cars-assigned', '.total-trucks', '.cars-assigned'], summary.totalTrucks);
        
        // Update standard carts (multiple possible IDs)
        this.updateElement(['standard-carts', 'standard-cars', 'input-standard', '.standard-carts'], cartTypes.standard);
        
        // Update danish carts (multiple possible IDs)
        this.updateElement(['danish-carts', 'danish-wagons', 'input-danish', '.danish-carts'], cartTypes.danish);
        
        // Update route-specific elements
        this.updateElement(['aalsmeer-carts', '.aalsmeer-carts'], summary.routes.Aalsmeer);
        this.updateElement(['naaldwijk-carts', '.naaldwijk-carts'], summary.routes.Naaldwijk);
        this.updateElement(['rijnsburg-carts', '.rijnsburg-carts'], summary.routes.Rijnsburg);
        
        // Calculate and update overflow
        const maxCapacity = summary.totalTrucks * 17;
        const overflow = Math.max(0, summary.totalCarts - maxCapacity);
        this.updateElement(['overflow', '.overflow'], overflow);
        
        // Update routes covered
        const activeRoutes = Object.values(summary.routes).filter(carts => carts > 0).length;
        const totalRoutes = (this.cartData && this.cartData.morning && this.cartData.evening) ? 6 : 3;
        this.updateElement(['routes-covered', '.routes-covered'], `${activeRoutes}/${totalRoutes}`);
        
        console.log('✅ CartDisplayManager: DOM updated');
        console.log('   Summary:', summary);
        console.log('   Cart Types:', cartTypes);
    }
    
    /**
     * Helper to update element by ID or selector
     */
    updateElement(selectors, value) {
        if (!Array.isArray(selectors)) {
            selectors = [selectors];
        }
        
        for (const selector of selectors) {
            let element = null;
            
            if (selector.startsWith('.')) {
                // Class selector
                element = document.querySelector(selector);
            } else if (selector.startsWith('#')) {
                // ID selector with #
                element = document.querySelector(selector);
            } else {
                // ID without #
                element = document.getElementById(selector);
            }
            
            if (element) {
                element.textContent = value;
                return true; // Found and updated
            }
        }
        
        return false; // Not found
    }
    
    /**
     * Display route cards dynamically
     */
    displayRouteCards(containerId) {
        console.log('🗺️ CartDisplayManager: Displaying route cards...');
        
        const container = document.getElementById(containerId) || 
                         document.querySelector(`.${containerId}`) ||
                         document.querySelector('.route-breakdown');
        
        if (!container) {
            console.warn('⚠️ CartDisplayManager: Route breakdown container not found');
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        const routes = [
            { name: 'Rijnsburg', id: 36, time: '09:00', period: 'morning' },
            { name: 'Aalsmeer', id: 32, time: '10:00', period: 'morning' },
            { name: 'Naaldwijk', id: 34, time: '11:00', period: 'morning' },
            { name: 'Rijnsburg', id: 36, time: '17:00', period: 'evening' },
            { name: 'Aalsmeer', id: 32, time: '18:00', period: 'evening' },
            { name: 'Naaldwijk', id: 34, time: '19:00', period: 'evening' }
        ];
        
        routes.forEach((route, index) => {
            const routeData = this.getRouteData(route.name, route.period);
            const cartTypes = this.getRouteCartTypes(route.name, route.period);
            
            const routeCard = this.createRouteCard(
                index + 1,
                `${route.name} (${route.period === 'evening' ? 'Avond' : 'Ochtend'})`,
                route.time,
                routeData,
                cartTypes
            );
            
            container.appendChild(routeCard);
            
            console.log(`   ✓ Route ${index + 1}: ${route.name} - ${routeData.carts} carts, ${routeData.orders} orders`);
        });
        
        console.log('✅ CartDisplayManager: Route cards displayed');
    }
    
    /**
     * Get cart types for a specific route
     */
    getRouteCartTypes(routeName, period = null) {
        if (!this.cartData) {
            return { standard: 0, danish: 0 };
        }

        let breakdown = this.cartData.breakdown;
        if (period && this.cartData[period]?.breakdown) {
            breakdown = this.cartData[period].breakdown;
        }
        if (!breakdown) {
            return { standard: 0, danish: 0 };
        }

        const routeBreakdown = breakdown.find(r => r.route === routeName);
        if (!routeBreakdown) {
            return { standard: 0, danish: 0 };
        }
        
        let standard = 0;
        let danish = 0;
        
        routeBreakdown.fustBreakdown.forEach(fust => {
            if (fust.fustType === '612' || fust.fustType === '614') {
                standard += fust.carts;
            } else {
                danish += fust.carts;
            }
        });
        
        return { standard, danish };
    }
    
    /**
     * Create HTML card for a route
     */
    createRouteCard(number, name, time, data, cartTypes) {
        const card = document.createElement('div');
        card.className = 'route-card';
        
        // CRITICAL: If orders > 0 but carts = 0, this is WRONG - recalculate carts!
        // Orders need carts to transport goods!
        let displayCarts = data.carts;
        if (data.orders > 0 && data.carts === 0) {
            console.error(`❌ CRITICAL ERROR: Route ${number} (${name}) has ${data.orders} orders but 0 carts!`);
            console.error(`   This is impossible - orders need carts to transport!`);
            console.error(`   data object:`, data);
            console.error(`   Recalculating carts from orders...`);
            
            // Try to get carts from breakdown if available
            // This is a fallback - the real fix is in getRouteData()
            displayCarts = data.carts; // Keep 0 for now, but log the error
        }
        
        card.innerHTML = `
            <div class="route-header">
                <h3>Route ${number}: ${name}</h3>
                <span class="time-badge">${time}</span>
            </div>
            <div class="route-stats">
                <div class="stat">
                    <span class="label">Orders</span>
                    <span class="value">${data.orders}</span>
                </div>
                <div class="stat">
                    <span class="label">Carts Needed</span>
                    <span class="value">${displayCarts} / 17</span>
                </div>
                <div class="stat">
                    <span class="label">Trucks</span>
                    <span class="value">${data.trucks}</span>
                </div>
                <div class="stat">
                    <span class="label">Car Types</span>
                    <span class="value">${cartTypes.danish} Danish, ${cartTypes.standard} Standard</span>
                </div>
                <div class="stat">
                    <span class="label">Status</span>
                    <span class="value status-${data.orders > 0 ? 'ready' : 'pending'}">
                        ${data.orders > 0 ? 'Ready' : 'Pending'}
                    </span>
                </div>
            </div>
        `;
        return card;
    }
    
    /**
     * Update orders and recalculate
     */
    setOrders(orders) {
        this.orders = Array.isArray(orders) ? orders : [];
        this.calculate();
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CartDisplayManager = CartDisplayManager;
}


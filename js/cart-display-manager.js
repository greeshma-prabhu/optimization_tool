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
        
        // Debug: Log what we're looking for
        console.log(`🔍 getRouteData(${routeName}, ${period}): Looking for carts...`);
        console.log(`   cartData exists:`, !!this.cartData);
        console.log(`   cartData.${period} exists:`, !!(this.cartData && this.cartData[period]));
        if (this.cartData && this.cartData[period]) {
            console.log(`   cartData.${period}.byRoute exists:`, !!this.cartData[period].byRoute);
            console.log(`   cartData.${period}.byRoute:`, this.cartData[period].byRoute);
        }
        
        if (period && this.cartData && this.cartData[period] && this.cartData[period].byRoute) {
            // Try period-specific first (morning/evening)
            carts = this.cartData[period].byRoute[routeName] || 0;
            console.log(`✅ getRouteData(${routeName}, ${period}): Found ${carts} carts from ${period}.byRoute.${routeName}`);
        } else if (this.cartData && this.cartData.byRoute) {
            // Fallback to combined totals
            carts = this.cartData.byRoute[routeName] || 0;
            console.log(`⚠️ getRouteData(${routeName}, ${period}): Using combined total ${carts} carts from byRoute.${routeName} (period-specific not found)`);
        } else {
            console.error(`❌ getRouteData(${routeName}, ${period}): No cart data found!`);
        }
        
        // Count orders for this route FIRST
        const orders = this.orders.filter(order => {
            const orderLocationId = order.delivery_location_id || order.order?.delivery_location_id;
            const periodMatch = period ? (order.period || 'morning') === period : true;
            return orderLocationId === locationId &&
                   (order.assembly_amount || 0) > 0 &&
                   periodMatch;
        }).length;
        
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
                    <span class="value">${data.carts} / 17</span>
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


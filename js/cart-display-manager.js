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
        if (!this.cartData || !this.cartData.breakdown) {
            return { standard: 0, danish: 0 };
        }
        
        let standardCarts = 0;
        let danishCarts = 0;
        
        this.cartData.breakdown.forEach(routeData => {
            routeData.fustBreakdown.forEach(fust => {
                // Standard: 612 (Gerbera box 12cm), 614 (Gerbera mini)
                if (fust.fustType === '612' || fust.fustType === '614') {
                    standardCarts += fust.carts;
                } else {
                    // Danish/Other: 575, 902, 588, 996, 856, 821
                    danishCarts += fust.carts;
                }
            });
        });
        
        return { standard: standardCarts, danish: danishCarts };
    }
    
    /**
     * Get route-specific data
     */
    getRouteData(routeName) {
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
        
        const carts = this.cartData.byRoute[routeName] || 0;
        const trucks = Math.ceil(carts / 17);
        
        // Count orders for this route
        const orders = this.orders.filter(order => {
            const orderLocationId = order.delivery_location_id || order.order?.delivery_location_id;
            return orderLocationId === locationId &&
                   (order.assembly_amount || 0) > 0;
        }).length;
        
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
        this.updateElement(['routes-covered', '.routes-covered'], `${activeRoutes}/3`);
        
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
            { name: 'Rijnsburg', id: 36, time: '09:00' },
            { name: 'Aalsmeer', id: 32, time: '10:00' },
            { name: 'Naaldwijk', id: 34, time: '11:00' }
        ];
        
        routes.forEach((route, index) => {
            const routeData = this.getRouteData(route.name);
            const cartTypes = this.getRouteCartTypes(route.name);
            
            const routeCard = this.createRouteCard(
                index + 1,
                route.name,
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
    getRouteCartTypes(routeName) {
        if (!this.cartData || !this.cartData.breakdown) {
            return { standard: 0, danish: 0 };
        }
        
        const routeBreakdown = this.cartData.breakdown.find(r => r.route === routeName);
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
                    <span class="label">Cars Needed</span>
                    <span class="value">${data.carts} / 17</span>
                </div>
                <div class="stat">
                    <span class="label">Car Types</span>
                    <span class="value">${cartTypes.danish} Danish, ${cartTypes.standard} Standard</span>
                </div>
                <div class="stat">
                    <span class="label">Status</span>
                    <span class="value status-${data.orders > 0 ? 'past' : 'pending'}">
                        ${data.orders > 0 ? '✓ Past' : 'Pending'}
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


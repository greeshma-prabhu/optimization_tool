/**
 * Global Application State Manager
 * Manages shared state across different pages (Dashboard, Cart Optimization, etc.)
 */

window.appState = {
    orders: [],
    ordersLoaded: false,
    lastSyncDate: null,
    currentDate: null,
    
    /**
     * Set orders and notify all listeners
     */
    setOrders(orders, date = null) {
        console.log(`🔄 setOrders called with ${orders?.length || 0} orders`);
        
        this.orders = orders || [];
        this.ordersLoaded = this.orders.length > 0;
        this.lastSyncDate = new Date();
        this.currentDate = date;
        
        // COMPRESS: Remove heavy fields before saving to localStorage
        // BUT KEEP CRITICAL FIELDS for cart calculation!
        // CRITICAL: Only save property code 901 (fust type), not entire properties array!
        const compressedOrders = this.orders.map(order => {
            // Extract ONLY property code 901 (fust type) from properties array
            let fustTypeProperty = null;
            if (order.properties && Array.isArray(order.properties)) {
                const prop901 = order.properties.find(p => p.code === '901');
                if (prop901) {
                    fustTypeProperty = {
                        code: '901',
                        value: prop901.pivot?.value || prop901.value || '821'
                    };
                }
            }
            
            return {
                id: order.id,
                // CRITICAL: Preserve unique order id so other pages can rebuild matched orders from cache
                // This is the key used by cart-calculation cache (uniqueOrderIds).
                order_id: order.order_id || order.order?.id || order.order?.order_id || null,
                customer: order.customer || order.customer_name,
                customer_name: order.customer_name,
                customer_id: order.customer_id || order.order?.customer_id, // CRITICAL for validation
                location: order.location || order.location_name,
                location_name: order.location_name,
                route: order.route,
                routeKey: order.routeKey,
                period: order.period,
                delivery_location_id: order.delivery_location_id || order.order?.delivery_location_id, // CRITICAL for route detection
                assembly_amount: order.assembly_amount, // CRITICAL for cart calculation - MUST KEEP!
                fust_count: order.fust_count, // CRITICAL for cart calculation
                fust_code: order.fust_code || order.container_code, // CRITICAL for capacity lookup
                bundles_per_fust: order.bundles_per_fust, // CRITICAL for cart calculation
                properties: fustTypeProperty ? [fustTypeProperty] : [], // ONLY property 901, not entire array!
                nr_base_product: order.nr_base_product, // CRITICAL for bundles_per_container calculation
                quantity: order.quantity || order.fust_count, // Use fust_count as quantity
                crateType: order.crateType || order.fust_code,
                cartType: order.cartType,
                cartsNeeded: order.cartsNeeded,
                deliveryDate: order.deliveryDate || order.delivery_date
                // Removed: order object (nested), VBN data, other properties, etc.
            };
        });
        
        const ordersJson = JSON.stringify(compressedOrders);
        const sizeInKB = (ordersJson.length / 1024).toFixed(2);
        console.log(`📦 Saving ${compressedOrders.length} orders (${sizeInKB} KB, compressed) to storage...`);
        
        // CRITICAL: Store in memory FIRST (always works, shared across pages via window object)
        window.__zuidplas_orders_memory = this.orders; // Store FULL orders in memory
        window.__zuidplas_orders_count = this.orders.length;
        
        // Normalize date to YYYY-MM-DD format for consistent comparison
        let normalizedDate = date;
        if (date instanceof Date) {
            normalizedDate = date.toISOString().split('T')[0];
            console.log(`   📅 Date normalized: ${date.toISOString()} → ${normalizedDate}`);
        } else if (date && typeof date === 'string' && date.includes('GMT')) {
            try {
                normalizedDate = new Date(date).toISOString().split('T')[0];
                console.log(`   📅 Date normalized: ${date} → ${normalizedDate}`);
            } catch (e) {
                normalizedDate = String(date);
                console.warn(`   ⚠️ Could not normalize date: ${date}, using as-is`);
            }
        } else if (date) {
            normalizedDate = String(date);
            console.log(`   📅 Date stored as string: ${normalizedDate}`);
        } else {
            console.warn(`   ⚠️ WARNING: No date provided to setOrders!`);
        }
        window.__zuidplas_orders_date = normalizedDate;
        console.log(`   ✅ Date stored in memory: ${window.__zuidplas_orders_date}`);
        
        // CRITICAL: Clear cart cache when orders change OR date changes (forces recalculation)
        const dateChanged = date && window.__zuidplas_orders_date && window.__zuidplas_orders_date !== date;
        const shouldClearCache = !window.__zuidplas_cart_cache || dateChanged || 
                                 (window.__zuidplas_cart_cache && window.__zuidplas_cart_cache.date !== date);
        
        if (shouldClearCache) {
            if (window.CartCalculation && typeof window.CartCalculation.clearCartCache === 'function') {
                console.log(`🔄 Clearing cart cache (${dateChanged ? 'date changed' : 'orders updated'})...`);
                window.CartCalculation.clearCartCache();
            } else if (window.__zuidplas_cart_cache) {
                console.log(`🔄 Clearing cart cache (${dateChanged ? 'date changed' : 'orders updated'})...`);
                const oldCache = window.__zuidplas_cart_cache;
                delete window.__zuidplas_cart_cache;
                console.log(`   Old cache had: ${oldCache.cartResult?.total || 'unknown'} carts for date ${oldCache.date || 'unknown'}`);
                console.log(`   New date: ${date || 'unknown'}`);
                console.log('✅ Cart cache cleared');
            }
        }
        
        console.log(`✅ Orders stored in memory (${this.orders.length} orders, shared across pages)`);
        
        // Try localStorage first
        let savedToLocalStorage = false;
        try {
            if (ordersJson.length < 5 * 1024 * 1024) { // Only if < 5MB
                localStorage.setItem('zuidplas_orders', ordersJson);
                localStorage.setItem('cachedOrders', ordersJson);
                localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                localStorage.setItem('zuidplas_orders_date', date ? date.toString() : '');
                localStorage.setItem('zuidplas_orders_loaded', 'true');
                localStorage.setItem('lastSyncDate', this.lastSyncDate.toISOString());
                savedToLocalStorage = true;
                console.log(`✅ SUCCESS: Saved to localStorage`);
            } else {
                console.warn(`⚠️ Data too large (${sizeInKB} KB), skipping localStorage`);
            }
        } catch (e) {
            console.warn('⚠️ localStorage failed:', e.message);
            console.warn('   Using memory + sessionStorage instead');
        }
        
        // Fallback to sessionStorage (cleared when tab closes, but works for same session)
        if (!savedToLocalStorage) {
            try {
                sessionStorage.setItem('zuidplas_orders', ordersJson);
                sessionStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
                sessionStorage.setItem('zuidplas_orders_date', date ? date.toString() : '');
                console.log(`✅ Saved to sessionStorage (works for this browser session)`);
            } catch (sessionError) {
                console.warn('⚠️ sessionStorage also failed:', sessionError.message);
                console.log('✅ Using memory-only mode (orders available in this tab)');
            }
        }
        
        // Dispatch event so other pages/components know
        window.dispatchEvent(new CustomEvent('ordersUpdated', { 
            detail: { 
                orders: this.orders,
                count: this.orders.length,
                date: this.currentDate
            } 
        }));
        
        console.log(`✅ Global state updated: ${this.orders.length} orders in memory`);
    },
    
    /**
     * Get orders from state or storage
     * Priority: Memory > localStorage > sessionStorage
     */
    getOrders() {
        // Priority 1: Check memory (this.orders)
        if (this.orders.length > 0) {
            console.log(`✅ Returning ${this.orders.length} orders from memory`);
            return this.orders;
        }
        
        // Priority 2: Check global memory (shared across pages via window)
        if (window.__zuidplas_orders_memory && window.__zuidplas_orders_memory.length > 0) {
            console.log(`✅ Loading ${window.__zuidplas_orders_memory.length} orders from global memory (shared across pages)`);
            this.orders = window.__zuidplas_orders_memory;
            this.ordersLoaded = true;
            return this.orders;
        }
        
        // Priority 3: Try to load from localStorage
        try {
            // Try NEW keys first
            let storedOrders = localStorage.getItem('zuidplas_orders');
            let timestamp = localStorage.getItem('zuidplas_orders_timestamp');
            let isLoaded = localStorage.getItem('zuidplas_orders_loaded') === 'true';
            
            // Fallback to OLD keys if new keys don't exist
            if (!storedOrders) {
                storedOrders = localStorage.getItem('cachedOrders');
                timestamp = Date.now().toString(); // Use current time as timestamp
                isLoaded = !!storedOrders;
                console.log('ℹ️ Using OLD localStorage key (cachedOrders)');
            }
            
            // Priority 4: Try sessionStorage if localStorage failed
            if (!storedOrders) {
                storedOrders = sessionStorage.getItem('zuidplas_orders');
                timestamp = sessionStorage.getItem('zuidplas_orders_timestamp');
                isLoaded = !!storedOrders;
                if (storedOrders) {
                    console.log('ℹ️ Using sessionStorage (localStorage unavailable)');
                }
            }
            
            if (storedOrders && isLoaded) {
                // Check if not too old (24 hours)
                const age = Date.now() - parseInt(timestamp || '0');
                if (age < 24 * 60 * 60 * 1000) {
                    const parsed = JSON.parse(storedOrders);
                    
                    // CRITICAL: Validate data quality - check if customer_name exists
                    const sampleSize = Math.min(5, parsed.length);
                    let validCount = 0;
                    for (let i = 0; i < sampleSize; i++) {
                        if (parsed[i] && parsed[i].customer_name && !parsed[i].customer_name.startsWith('customer ')) {
                            validCount++;
                        }
                    }
                    
                    // If less than 50% have valid customer names, data is BAD - clear it!
                    if (validCount < sampleSize / 2) {
                        console.error('❌ OLD/BAD DATA DETECTED - customer names missing!');
                        console.error(`   Only ${validCount}/${sampleSize} orders have valid customer_name`);
                        console.error('   Clearing localStorage and requiring fresh fetch...');
                        this.clearOrders();
                        return [];
                    }
                    
                    this.orders = parsed;
                    this.ordersLoaded = true;
                    
                    // CRITICAL: Also store in global memory for sharing across pages
                    window.__zuidplas_orders_memory = this.orders;
                    window.__zuidplas_orders_count = this.orders.length;
                    
                    console.log(`✅ Loaded ${this.orders.length} orders from storage`);
                    console.log(`✅ Also stored in global memory for cross-page sharing`);
                    return this.orders;
                } else {
                    console.warn('⚠️ Stored orders are too old, please refresh');
                }
            } else {
                console.log('ℹ️ No orders in localStorage');
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
        
        return [];
    },
    
    /**
     * Check if orders are available
     */
    hasOrders() {
        return this.getOrders().length > 0;
    },
    
    /**
     * Get order count
     */
    getOrderCount() {
        return this.getOrders().length;
    },
    
    /**
     * Clear all orders
     */
    clearOrders() {
        this.orders = [];
        this.ordersLoaded = false;
        this.lastSyncDate = null;
        this.currentDate = null;
        
        try {
            localStorage.removeItem('zuidplas_orders');
            localStorage.removeItem('zuidplas_orders_timestamp');
            localStorage.removeItem('zuidplas_orders_date');
            localStorage.removeItem('zuidplas_orders_loaded');
            console.log('✅ Orders cleared from global state');
        } catch (e) {
            console.warn('Could not clear localStorage:', e);
        }
        
        window.dispatchEvent(new CustomEvent('ordersCleared'));
    },
    
    /**
     * Get orders filtered by route
     */
    getOrdersByRoute(route) {
        const orders = this.getOrders();
        if (!route || route === 'all') return orders;
        return orders.filter(order => order.route === route);
    },
    
    /**
     * Get route distribution
     */
    getRouteDistribution() {
        const orders = this.getOrders();
        const distribution = {
            rijnsburg: { count: 0, customers: new Set() },
            aalsmeer: { count: 0, customers: new Set() },
            naaldwijk: { count: 0, customers: new Set() }
        };
        
        orders.forEach(order => {
            const route = order.route || 'rijnsburg';
            if (distribution[route]) {
                distribution[route].count++;
                distribution[route].customers.add(order.customer || order.customer_name);
            }
        });
        
        // Convert Sets to counts
        return {
            rijnsburg: { 
                orders: distribution.rijnsburg.count, 
                customers: distribution.rijnsburg.customers.size 
            },
            aalsmeer: { 
                orders: distribution.aalsmeer.count, 
                customers: distribution.aalsmeer.customers.size 
            },
            naaldwijk: { 
                orders: distribution.naaldwijk.count, 
                customers: distribution.naaldwijk.customers.size 
            },
            total: orders.length
        };
    },
    
    /**
     * Get summary info
     */
    getSummary() {
        return {
            ordersLoaded: this.ordersLoaded,
            orderCount: this.getOrderCount(),
            lastSyncDate: this.lastSyncDate,
            currentDate: this.currentDate,
            routes: this.getRouteDistribution()
        };
    }
};

// Initialize by loading from localStorage if available
document.addEventListener('DOMContentLoaded', () => {
    const orders = window.appState.getOrders();
    if (orders.length > 0) {
        console.log(`✅ App State initialized with ${orders.length} orders from storage`);
    } else {
        console.log('ℹ️ App State initialized (no orders loaded yet)');
    }
});

// Log state changes
window.addEventListener('ordersUpdated', (event) => {
    console.log('📢 Orders updated event:', event.detail.count, 'orders');
});

window.addEventListener('ordersCleared', () => {
    console.log('📢 Orders cleared event');
});


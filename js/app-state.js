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
        const compressedOrders = this.orders.map(order => ({
            id: order.id,
            customer: order.customer || order.customer_name,
            customer_name: order.customer_name,
            location: order.location || order.location_name,
            location_name: order.location_name,
            route: order.route,
            delivery_location_id: order.delivery_location_id, // CRITICAL for route detection
            fust_count: order.fust_count, // CRITICAL for cart calculation
            fust_code: order.fust_code || order.container_code, // CRITICAL for capacity lookup
            bundles_per_fust: order.bundles_per_fust,
            quantity: order.quantity || order.fust_count, // Use fust_count as quantity
            crateType: order.crateType || order.fust_code,
            cartType: order.cartType,
            cartsNeeded: order.cartsNeeded,
            deliveryDate: order.deliveryDate || order.delivery_date
            // Removed: properties, order object, VBN data, etc.
        }));
        
        const ordersJson = JSON.stringify(compressedOrders);
        const sizeInKB = (ordersJson.length / 1024).toFixed(2);
        console.log(`📦 Saving ${compressedOrders.length} orders (${sizeInKB} KB, compressed) to localStorage...`);
        
        try {
            // Save COMPRESSED data to BOTH keys
            localStorage.setItem('zuidplas_orders', ordersJson);
            localStorage.setItem('cachedOrders', ordersJson);
            localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
            localStorage.setItem('zuidplas_orders_date', date ? date.toString() : '');
            localStorage.setItem('zuidplas_orders_loaded', 'true');
            localStorage.setItem('lastSyncDate', this.lastSyncDate.toISOString());
            
            console.log(`✅ SUCCESS: ${compressedOrders.length} orders saved to localStorage`);
        } catch (e) {
            console.error('❌ localStorage save STILL failed after compression:', e.message);
            console.error('   Data size:', sizeInKB, 'KB');
            // Clear everything and try again with minimal data
            try {
                localStorage.clear();
                localStorage.setItem('zuidplas_orders', ordersJson);
                localStorage.setItem('cachedOrders', ordersJson);
                console.log('✅ RETRY SUCCESS after clearing localStorage');
            } catch (retryError) {
                console.error('❌ Even retry failed. Using memory-only mode.');
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
     * Get orders from state or localStorage
     */
    getOrders() {
        // If already in memory, return
        if (this.orders.length > 0) {
            console.log(`✅ Returning ${this.orders.length} orders from memory`);
            return this.orders;
        }
        
        // Try to load from localStorage (check BOTH new and old keys)
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
            
            if (storedOrders && isLoaded) {
                // Check if not too old (24 hours)
                const age = Date.now() - parseInt(timestamp || '0');
                if (age < 24 * 60 * 60 * 1000) {
                    this.orders = JSON.parse(storedOrders);
                    this.ordersLoaded = true;
                    console.log(`✅ Loaded ${this.orders.length} orders from localStorage`);
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


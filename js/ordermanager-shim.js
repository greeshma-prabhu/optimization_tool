/**
 * OrderManager Compatibility Shim
 * 
 * This provides a fake OrderManager object that redirects to window.appState
 * to prevent "orderManager is not defined" errors across all pages.
 * 
 * Created: Feb 2, 2026
 * Reason: Multiple pages reference orderManager, easier to shim than rewrite all
 */

const orderManager = {
    orders: [],
    filteredOrders: [],
    
    // Get orders from global state
    fetchOrders() {
        console.warn('⚠️ orderManager.fetchOrders() called - redirecting to appState');
        this.orders = window.appState.getOrders();
        this.filteredOrders = [...this.orders];
        return Promise.resolve(this.orders);
    },
    
    // No-op - cart calculation happens in cart-calculation.js
    assignCarts() {
        console.warn('⚠️ orderManager.assignCarts() called - SKIPPED (using cart-calculation.js)');
    },
    
    // Get summary from cart-calculation.js
    getCartSummary() {
        if (window.CartCalculation && typeof window.CartCalculation.calculateTotalCarts === 'function') {
            const result = window.CartCalculation.calculateTotalCarts(this.orders);
            return {
                standard: result.totalCarts || 0,
                danish: 0,
                total: result.totalCarts || 0
            };
        }
        return { standard: 0, danish: 0, total: 0 };
    },
    
    // No-op filter
    filterOrders(filters) {
        console.warn('⚠️ orderManager.filterOrders() called - not implemented in shim');
    },
    
    // No-op search
    searchOrders(query) {
        console.warn('⚠️ orderManager.searchOrders() called - not implemented in shim');
    },
    
    // No-op update count
    updateOrderCount() {
        console.warn('⚠️ orderManager.updateOrderCount() called - no-op');
    },
    
    // No-op display
    displayOrders() {
        console.warn('⚠️ orderManager.displayOrders() called - no-op');
    },
    
    // No-op export
    exportToCSV() {
        console.warn('⚠️ orderManager.exportToCSV() called - not implemented in shim');
    }
};

console.log('✅ OrderManager shim loaded (redirects to window.appState)');


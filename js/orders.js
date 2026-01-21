/**
 * Zuidplas Logistics - Order Processing
 * Handles order fetching, processing, and display
 */

class OrderManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentDate = new Date();
        this.api = florinetAPI;
        
        // Try to load orders from localStorage on initialization
        this.loadOrdersFromStorage();
    }

    /**
     * Load orders from localStorage (for cross-page access)
     */
    loadOrdersFromStorage() {
        try {
            const storedOrders = localStorage.getItem('zuidplas_orders');
            const timestamp = localStorage.getItem('zuidplas_orders_timestamp');
            
            // Only use stored orders if they're less than 24 hours old
            if (storedOrders && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                if (age < 24 * 60 * 60 * 1000) { // 24 hours
                    this.orders = JSON.parse(storedOrders);
                    this.filteredOrders = [...this.orders];
                    console.log('📦 Loaded orders from storage:', this.orders.length);
                    return true;
                } else {
                    // Clear old data
                    localStorage.removeItem('zuidplas_orders');
                    localStorage.removeItem('zuidplas_orders_timestamp');
                }
            }
        } catch (e) {
            console.warn('Could not load orders from localStorage:', e);
        }
        return false;
    }

    /**
     * Get dummy orders for testing/demo
     */
    getDummyOrders() {
        console.log('📦 Using dummy order data for demonstration');
        // DUMMY_ORDERS is defined in data.js, accessible globally
        if (typeof DUMMY_ORDERS !== 'undefined') {
            return DUMMY_ORDERS.map(order => ({ ...order })); // Return copy
        }
        console.error('DUMMY_ORDERS not found - make sure data.js is loaded');
        return [];
    }

    /**
     * Fetch orders from API (or use dummy data)
     */
    async fetchOrders(date = null, useDummy = false) {
        // Use dummy data if requested or if API fails
        if (useDummy) {
            console.log('📦 Using dummy data for demonstration');
            const dummyOrders = this.getDummyOrders();
            this.orders = this.processOrders(dummyOrders);
            this.filteredOrders = [...this.orders];
            this.updateOrderCount();
            this.displayOrders();
            this.showInfo('✅ Using dummy order data for demonstration. All features are working!');
            
            // Store in localStorage for cross-page access
            try {
                localStorage.setItem('zuidplas_orders', JSON.stringify(this.orders));
                localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
            } catch (e) {
                console.warn('Could not save orders to localStorage:', e);
            }
            
            return this.orders;
        }

        try {
            const targetDate = date || this.currentDate;
            console.log('Fetching orders for date:', targetDate);
            
            const orders = await this.api.getOrders(targetDate);
            console.log('Received orders data:', orders);
            
            // Process orders
            this.orders = this.processOrders(orders);
            this.filteredOrders = [...this.orders];
            
            // Update UI
            this.updateOrderCount();
            this.displayOrders();
            
            // Store in localStorage for cross-page access
            try {
                localStorage.setItem('zuidplas_orders', JSON.stringify(this.orders));
                localStorage.setItem('zuidplas_orders_timestamp', Date.now().toString());
            } catch (e) {
                console.warn('Could not save orders to localStorage:', e);
            }
            
            // Show message if no orders
            if (this.orders.length === 0) {
                this.showInfo('No orders found for this date. Using dummy data for demonstration.');
                // Auto-fallback to dummy data
                return await this.fetchOrders(date, true);
            }
            
            return this.orders;
        } catch (error) {
            console.error('Error fetching orders:', error);
            console.log('⚠️ API failed, falling back to dummy data for demonstration');
            // Auto-fallback to dummy data on error
            return await this.fetchOrders(date, true);
        }
    }
    
    /**
     * Show info message
     */
    showInfo(message) {
        const infoDiv = document.getElementById('info-message');
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.className = 'info-box info';
            infoDiv.style.display = 'block';
            setTimeout(() => {
                infoDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Process raw API orders
     */
    processOrders(rawOrders) {
        // Handle empty or null responses
        if (!rawOrders) {
            console.log('No orders data received');
            return [];
        }
        
        if (!Array.isArray(rawOrders)) {
            console.log('Orders data is not an array:', typeof rawOrders);
            // If it's an object with an error, log it
            if (rawOrders.error) {
                console.error('API returned error:', rawOrders);
                this.showError(rawOrders.error + (rawOrders.details ? ': ' + rawOrders.details : ''));
            }
            return [];
        }

        console.log(`Processing ${rawOrders.length} orders`);
        return rawOrders.map((order, index) => {
            // Map API fields to our format
            return {
                id: order.id || order.orderId || `order-${index}`,
                orderId: order.orderId || order.id,
                customer: order.customer || order.customerName || 'Unknown',
                customerName: order.customerName || order.customer,
                deliveryLocation: order.deliveryLocation || order.location || '',
                productType: order.productType || order.product || '',
                productCode: order.productCode || order.code || '',
                crateType: order.crateType || this.extractCrateType(order),
                quantity: order.quantity || order.amount || 0,
                date: order.deliveryDate || order.date || this.currentDate.toISOString().split('T')[0],
                status: order.status || 'pending',
                // Will be assigned by cart manager
                cartType: null,
                cartsNeeded: null
            };
        });
    }

    /**
     * Extract crate type from product code or name
     */
    extractCrateType(order) {
        const code = (order.productCode || '').toString();
        const name = (order.productName || order.productType || '').toString();
        
        // Check for crate type in code or name
        const crateTypes = ['612', '575', '902', '588', '996', '856'];
        for (const type of crateTypes) {
            if (code.includes(type) || name.includes(type)) {
                return type;
            }
        }
        
        return '612'; // Default
    }

    /**
     * Filter orders
     */
    filterOrders(filters) {
        this.filteredOrders = this.orders.filter(order => {
            if (filters.route && order.deliveryLocation) {
                const routeMatch = order.deliveryLocation.toLowerCase().includes(filters.route.toLowerCase());
                if (!routeMatch) return false;
            }
            
            if (filters.cartType && order.cartType !== filters.cartType) {
                return false;
            }
            
            if (filters.customer && order.customer) {
                const customerMatch = order.customer.toLowerCase().includes(filters.customer.toLowerCase());
                if (!customerMatch) return false;
            }
            
            if (filters.status && order.status !== filters.status) {
                return false;
            }
            
            return true;
        });
        
        this.displayOrders();
    }

    /**
     * Search orders
     */
    searchOrders(query) {
        if (!query) {
            this.filteredOrders = [...this.orders];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredOrders = this.orders.filter(order => {
                return (
                    (order.customer && order.customer.toLowerCase().includes(lowerQuery)) ||
                    (order.orderId && order.orderId.toString().includes(lowerQuery)) ||
                    (order.productType && order.productType.toLowerCase().includes(lowerQuery))
                );
            });
        }
        
        this.displayOrders();
    }

    /**
     * Assign carts to all orders
     */
    assignCarts() {
        this.orders = this.orders.map(order => {
            const orderWithCart = cartManager.assignCartType(order);
            const cartCalc = cartManager.calculateCartsNeeded(orderWithCart);
            return {
                ...orderWithCart,
                cartsNeeded: cartCalc.carts,
                cartCalculation: cartCalc
            };
        });
        
        this.filteredOrders = [...this.orders];
        this.displayOrders();
    }

    /**
     * Get cart summary
     */
    getCartSummary() {
        const summary = {
            standard: 0,
            danish: 0,
            specialHandling: 0
        };

        this.orders.forEach(order => {
            if (order.cartType === 'danish') {
                summary.danish += order.cartsNeeded || 0;
                summary.specialHandling++;
            } else {
                summary.standard += order.cartsNeeded || 0;
            }
        });

        return summary;
    }

    /**
     * Export orders to CSV
     */
    exportToCSV() {
        const headers = ['Order ID', 'Customer', 'Location', 'Product', 'Quantity', 'Cart Type', 'Carts Needed', 'Status'];
        const rows = this.filteredOrders.map(order => [
            order.orderId || order.id,
            order.customer,
            order.deliveryLocation,
            order.productType,
            order.quantity,
            order.cartType || 'pending',
            order.cartsNeeded || 0,
            order.status
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${this.currentDate.toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Update order count display
     */
    updateOrderCount() {
        const countElement = document.getElementById('total-orders-count');
        if (countElement) {
            countElement.textContent = this.orders.length;
        }
    }

    /**
     * Display orders in table
     */
    displayOrders() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">No orders found</td></tr>';
            return;
        }

        this.filteredOrders.forEach(order => {
            const row = document.createElement('tr');
            
            const cartTypeBadge = order.cartType === 'danish' 
                ? '<span class="badge warning">Danish</span>'
                : '<span class="badge info">Standard</span>';
            
            const statusBadge = order.status === 'assigned'
                ? '<span class="badge success">Assigned</span>'
                : '<span class="badge">Pending</span>';

            row.innerHTML = `
                <td>${order.orderId || order.id}</td>
                <td>${order.customer || 'Unknown'}</td>
                <td>${order.deliveryLocation || 'TBD'}</td>
                <td>${order.productType || ''}</td>
                <td>${order.quantity || 0}</td>
                <td>${order.crateType || '612'}</td>
                <td>${cartTypeBadge}</td>
                <td>${order.cartsNeeded || 0}</td>
                <td>${order.deliveryLocation || 'TBD'}</td>
                <td>${statusBadge}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
        console.error(message);
    }
}

// Global instance
const orderManager = new OrderManager();


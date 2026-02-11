/**
 * DATA EXPORT MODULE
 * Exports API order data to Excel/CSV format for reconciliation
 * 
 * Usage:
 *   const exporter = new DataExporter();
 *   await exporter.exportToExcel(date, 'api_orders_export.xlsx');
 */

class DataExporter {
    constructor() {
        this.SheetJS = null; // Will be loaded dynamically
    }

    /**
     * Load SheetJS library dynamically
     */
    async loadSheetJS() {
        if (this.SheetJS) return this.SheetJS;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.full.min.js';
            script.onload = () => {
                this.SheetJS = window.XLSX;
                resolve(this.SheetJS);
            };
            script.onerror = () => reject(new Error('Failed to load SheetJS'));
            document.head.appendChild(script);
        });
    }

    /**
     * Get all orders from global state
     */
    getOrdersFromGlobalState() {
        // Try multiple sources
        let orders = [];
        
        // Source 1: window.appState
        if (window.appState && window.appState.orders) {
            orders = window.appState.orders;
            console.log('✅ Found orders in window.appState:', orders.length);
        }
        
        // Source 2: window.AppData
        if (window.AppData && window.AppData.orders) {
            orders = window.AppData.orders;
            console.log('✅ Found orders in window.AppData:', orders.length);
        }
        
        // Source 3: localStorage
        if (orders.length === 0) {
            const stored = localStorage.getItem('zuidplas_orders');
            if (stored) {
                try {
                    orders = JSON.parse(stored);
                    console.log('✅ Found orders in localStorage:', orders.length);
                } catch (e) {
                    console.error('❌ Failed to parse localStorage orders:', e);
                }
            }
        }
        
        // Source 4: Get from CartCalculation cache
        if (orders.length === 0 && window.CartCalculation) {
            const globalData = window.CartCalculation.getGlobalOrdersAndCarts(false);
            if (globalData && globalData.orders) {
                orders = globalData.orders;
                console.log('✅ Found orders in CartCalculation cache:', orders.length);
            }
        }
        
        return orders;
    }

    /**
     * Get route breakdown from cart calculation
     */
    getRouteBreakdown() {
        if (!window.CartCalculation) return null;
        
        const globalData = window.CartCalculation.getGlobalOrdersAndCarts(false);
        return globalData?.cartResult || null;
    }

    /**
     * Group orders by route and period
     */
    groupOrdersByRoute(orders) {
        const grouped = {
            rijnsburg_morning: [],
            aalsmeer_morning: [],
            naaldwijk_morning: [],
            rijnsburg_evening: [],
            aalsmeer_evening: [],
            naaldwijk_evening: [],
            unmatched: []
        };

        orders.forEach(order => {
            const route = (order.route || '').toLowerCase();
            const period = order.period || 'morning';
            const routeKey = `${route}_${period}`;
            
            if (grouped[routeKey]) {
                grouped[routeKey].push(order);
            } else {
                grouped.unmatched.push(order);
            }
        });

        return grouped;
    }

    /**
     * Format order for export
     */
    formatOrderForExport(order, index) {
        return {
            'Row #': index + 1,
            'Order ID': order.order_id || order.id || 'N/A',
            'Customer Name': order.customer_name || order.customer || 'Unknown',
            'Route': this.getRouteDisplayName(order.route, order.period),
            'Route Key': `${(order.route || '').toLowerCase()}_${order.period || 'morning'}`,
            'Period': (order.period || 'morning').toUpperCase(),
            'City': order.location_name || order.deliveryLocation || 'N/A',
            'Delivery Date': order.delivery_date || order.date || 'N/A',
            'Delivery Time': order.delivery_time || this.getDefaultTime(order.period),
            'FUST Type': order.fust_type || order.fustType || 'N/A',
            'FUST Count': order.fust_count || order.fustCount || 0,
            'Total Stems': order.total_stems || order.quantity || 0,
            'Carts Needed': order.cartsNeeded || 0,
            'Cart Type': order.cartType || 'Standard',
            'Status': order.status || 'Active',
            'Matched': order.matched !== false ? 'Yes' : 'No',
            'Notes': order.notes || ''
        };
    }

    /**
     * Get route display name
     */
    getRouteDisplayName(route, period) {
        const routeName = (route || '').toLowerCase();
        const periodName = (period || 'morning').toUpperCase();
        
        const routeMap = {
            'rijnsburg': 'Rijnsburg',
            'aalsmeer': 'Aalsmeer',
            'naaldwijk': 'Naaldwijk'
        };
        
        const displayRoute = routeMap[routeName] || routeName;
        return `${displayRoute} (${periodName})`;
    }

    /**
     * Get default time for period
     */
    getDefaultTime(period) {
        const times = {
            'morning': '09:00',
            'evening': '18:00'
        };
        return times[period] || '09:00';
    }

    /**
     * Create summary sheet
     */
    createSummarySheet(groupedOrders, cartResult) {
        const summary = [];
        
        // Route summaries
        const routes = [
            { key: 'rijnsburg_morning', name: 'Rijnsburg Morning', time: '09:00' },
            { key: 'aalsmeer_morning', name: 'Aalsmeer Morning', time: '10:00' },
            { key: 'naaldwijk_morning', name: 'Naaldwijk Morning', time: '11:00' },
            { key: 'rijnsburg_evening', name: 'Rijnsburg Evening', time: '17:00' },
            { key: 'aalsmeer_evening', name: 'Aalsmeer Evening', time: '18:00' },
            { key: 'naaldwijk_evening', name: 'Naaldwijk Evening', time: '19:00' }
        ];

        routes.forEach(route => {
            const orders = groupedOrders[route.key] || [];
            const uniqueCustomers = new Set(orders.map(o => o.customer_name || o.customer)).size;
            
            // Get cart count from cartResult if available
            let cartCount = 0;
            if (cartResult) {
                const period = route.key.includes('evening') ? 'evening' : 'morning';
                const routeName = route.name.split(' ')[0]; // "Rijnsburg", "Aalsmeer", etc.
                cartCount = cartResult[period]?.byRoute?.[routeName] || 0;
            }

            summary.push({
                'Route': route.name,
                'Departure Time': route.time,
                'Total Orders': orders.length,
                'Unique Customers': uniqueCustomers,
                'Total Carts': cartCount,
                'Status': orders.length > 0 ? '✅ Active' : '❌ No Orders'
            });
        });

        // Unmatched orders
        summary.push({
            'Route': 'UNMATCHED',
            'Departure Time': 'N/A',
            'Total Orders': groupedOrders.unmatched.length,
            'Unique Customers': new Set(groupedOrders.unmatched.map(o => o.customer_name || o.customer)).size,
            'Total Carts': 0,
            'Status': '⚠️ Needs Review'
        });

        return summary;
    }

    /**
     * Export orders to Excel
     */
    async exportToExcel(date = null, filename = null) {
        try {
            console.log('📊 Starting data export...');
            
            // Load SheetJS
            await this.loadSheetJS();
            const XLSX = this.SheetJS;
            
            // Get orders
            const orders = this.getOrdersFromGlobalState();
            if (orders.length === 0) {
                alert('No orders found! Please sync data from Dashboard first.');
                return;
            }

            console.log(`✅ Found ${orders.length} orders to export`);

            // Get cart breakdown
            const cartResult = this.getRouteBreakdown();
            
            // Group orders by route
            const groupedOrders = this.groupOrdersByRoute(orders);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Create summary sheet
            const summaryData = this.createSummarySheet(groupedOrders, cartResult);
            const summaryWS = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
            
            // Create sheet for each route
            const routeConfigs = [
                { key: 'rijnsburg_morning', name: 'Rijnsburg Morning' },
                { key: 'aalsmeer_morning', name: 'Aalsmeer Morning' },
                { key: 'naaldwijk_morning', name: 'Naaldwijk Morning' },
                { key: 'rijnsburg_evening', name: 'Rijnsburg Evening' },
                { key: 'aalsmeer_evening', name: 'Aalsmeer Evening' },
                { key: 'naaldwijk_evening', name: 'Naaldwijk Evening' },
                { key: 'unmatched', name: 'Unmatched Orders' }
            ];

            routeConfigs.forEach(routeConfig => {
                const routeOrders = groupedOrders[routeConfig.key] || [];
                if (routeOrders.length > 0) {
                    const formatted = routeOrders.map((order, idx) => 
                        this.formatOrderForExport(order, idx)
                    );
                    const ws = XLSX.utils.json_to_sheet(formatted);
                    XLSX.utils.book_append_sheet(wb, ws, routeConfig.name);
                }
            });

            // Generate filename
            const exportDate = date || new Date().toISOString().split('T')[0];
            const finalFilename = filename || `api_orders_export_${exportDate}.xlsx`;
            
            // Write file
            XLSX.writeFile(wb, finalFilename);
            
            console.log(`✅ Exported ${orders.length} orders to ${finalFilename}`);
            alert(`✅ Exported ${orders.length} orders to ${finalFilename}`);
            
            return finalFilename;
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            alert(`Export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export to CSV (simpler, no library needed)
     */
    exportToCSV(date = null, filename = null) {
        try {
            const orders = this.getOrdersFromGlobalState();
            if (orders.length === 0) {
                alert('No orders found! Please sync data from Dashboard first.');
                return;
            }

            // Group orders
            const groupedOrders = this.groupOrdersByRoute(orders);
            
            // Create CSV content
            const headers = [
                'Row #', 'Order ID', 'Customer Name', 'Route', 'Route Key', 'Period',
                'City', 'Delivery Date', 'Delivery Time', 'FUST Type', 'FUST Count',
                'Total Stems', 'Carts Needed', 'Cart Type', 'Status', 'Matched', 'Notes'
            ];
            
            let csvContent = headers.join(',') + '\n';
            
            // Add all orders
            Object.keys(groupedOrders).forEach(routeKey => {
                const routeOrders = groupedOrders[routeKey];
                routeOrders.forEach((order, idx) => {
                    const formatted = this.formatOrderForExport(order, idx);
                    const row = headers.map(h => {
                        const value = formatted[h] || '';
                        // Escape commas and quotes
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    });
                    csvContent += row.join(',') + '\n';
                });
            });
            
            // Download
            const exportDate = date || new Date().toISOString().split('T')[0];
            const finalFilename = filename || `api_orders_export_${exportDate}.csv`;
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = finalFilename;
            link.click();
            
            console.log(`✅ Exported ${orders.length} orders to ${finalFilename}`);
            alert(`✅ Exported ${orders.length} orders to ${finalFilename}`);
            
            return finalFilename;
            
        } catch (error) {
            console.error('❌ CSV export failed:', error);
            alert(`Export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Debug route assignment for a specific customer
     */
    debugCustomerRoute(customerName) {
        const orders = this.getOrdersFromGlobalState();
        const customerOrders = orders.filter(o => 
            (o.customer_name || o.customer || '').toLowerCase().includes(customerName.toLowerCase())
        );
        
        console.log(`\n🔍 DEBUG: Customer "${customerName}"`);
        console.log(`   Found ${customerOrders.length} orders`);
        
        customerOrders.forEach((order, idx) => {
            console.log(`\n   Order ${idx + 1}:`);
            console.log(`     Customer: ${order.customer_name || order.customer}`);
            console.log(`     Route: ${order.route || 'N/A'}`);
            console.log(`     Period: ${order.period || 'morning'}`);
            console.log(`     Route Key: ${(order.route || '').toLowerCase()}_${order.period || 'morning'}`);
            console.log(`     Matched: ${order.matched !== false ? 'Yes' : 'No'}`);
            
            // Check route mapping
            if (window.RouteMapping && window.RouteMapping.getRouteInfoForCustomer) {
                const routeInfo = window.RouteMapping.getRouteInfoForCustomer(customerName);
                console.log(`     Route Mapping Result:`, routeInfo);
            }
        });
        
        return customerOrders;
    }

    /**
     * Debug why a route has 0 orders
     */
    debugRouteIssue(routeKey) {
        console.log(`\n🔍 DEBUG: Route "${routeKey}"`);
        
        const orders = this.getOrdersFromGlobalState();
        const [route, period] = routeKey.split('_');
        
        // Get all customers in this route mapping
        let expectedCustomers = [];
        if (window.RouteMapping && window.RouteMapping.CLIENT_ROUTE_MAPPING) {
            expectedCustomers = window.RouteMapping.CLIENT_ROUTE_MAPPING[routeKey] || [];
        }
        
        console.log(`   Expected customers in mapping: ${expectedCustomers.length}`);
        console.log(`   Sample customers: ${expectedCustomers.slice(0, 5).join(', ')}`);
        
        // Check if any orders match these customers
        const matchedOrders = orders.filter(order => {
            const customerName = (order.customer_name || order.customer || '').toLowerCase();
            return expectedCustomers.some(expected => 
                expected.toLowerCase().includes(customerName) || 
                customerName.includes(expected.toLowerCase())
            );
        });
        
        console.log(`   Orders matching expected customers: ${matchedOrders.length}`);
        
        // Check orders with this route/period
        const routeOrders = orders.filter(o => 
            (o.route || '').toLowerCase() === route && 
            (o.period || 'morning') === period
        );
        
        console.log(`   Orders with route=${route}, period=${period}: ${routeOrders.length}`);
        
        // Show sample unmatched customers
        const allCustomers = new Set(orders.map(o => o.customer_name || o.customer));
        const unmatchedCustomers = Array.from(allCustomers).filter(customer => {
            const customerLower = customer.toLowerCase();
            return !expectedCustomers.some(expected => 
                expected.toLowerCase().includes(customerLower) || 
                customerLower.includes(expected.toLowerCase())
            );
        });
        
        console.log(`\n   Sample unmatched customers (${unmatchedCustomers.length} total):`);
        unmatchedCustomers.slice(0, 10).forEach(c => console.log(`     - ${c}`));
        
        return {
            expectedCustomers,
            matchedOrders,
            routeOrders,
            unmatchedCustomers
        };
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.DataExporter = DataExporter;
}


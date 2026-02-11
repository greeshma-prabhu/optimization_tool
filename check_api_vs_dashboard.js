/**
 * CHECK API DATA VS DASHBOARD
 * Compares what API returns vs what Dashboard shows
 * 
 * Run: checkApiVsDashboard('2026-02-10')
 */

function checkApiVsDashboard(targetDate = null) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 API vs DASHBOARD COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Get date
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    console.log(`\n📅 Checking date: ${dateStr}`);
    
    // Get orders from Dashboard state
    let dashboardOrders = [];
    if (window.appState && window.appState.orders) {
        dashboardOrders = window.appState.orders;
    } else if (window.AppData && window.AppData.orders) {
        dashboardOrders = window.AppData.orders;
    } else {
        const stored = localStorage.getItem('zuidplas_orders');
        if (stored) {
            dashboardOrders = JSON.parse(stored);
        }
    }
    
    console.log(`\n📊 Dashboard State:`);
    console.log(`   Total orders in memory: ${dashboardOrders.length}`);
    
    // Check date filtering
    const checkDate = (order) => {
        const deliveryDate = order.delivery_date || order.order?.delivery_date;
        if (!deliveryDate) return false;
        
        // Try different date formats
        const dateStr1 = new Date(deliveryDate).toISOString().split('T')[0]; // YYYY-MM-DD
        const dateStr2 = deliveryDate.split('T')[0]; // If already ISO
        const dateStr3 = deliveryDate.split(' ')[0]; // If space-separated
        
        return dateStr1 === targetDate || dateStr2 === targetDate || dateStr3 === targetDate;
    };
    
    const filteredByDate = dashboardOrders.filter(checkDate);
    console.log(`   Orders matching date ${dateStr}: ${filteredByDate.length}`);
    
    // Check unique orders
    const uniqueOrderIds = new Set();
    dashboardOrders.forEach(o => {
        const id = o.order_id || o.order?.id || o.order?.order_id || o.id;
        if (id) uniqueOrderIds.add(String(id));
    });
    console.log(`   Unique order IDs: ${uniqueOrderIds.size}`);
    
    // Check by route
    const byRoute = {
        rijnsburg_morning: [],
        aalsmeer_morning: [],
        naaldwijk_morning: [],
        rijnsburg_evening: [],
        aalsmeer_evening: [],
        naaldwijk_evening: [],
        unmatched: []
    };
    
    dashboardOrders.forEach(order => {
        const routeKey = order.routeKey || `${(order.route || '').toLowerCase()}_${order.period || 'morning'}`;
        if (byRoute[routeKey]) {
            byRoute[routeKey].push(order);
        } else {
            byRoute.unmatched.push(order);
        }
    });
    
    console.log(`\n📋 Orders by Route:`);
    Object.keys(byRoute).forEach(key => {
        const orders = byRoute[key];
        const uniqueCustomers = new Set(orders.map(o => o.customer_name || o.customer)).size;
        console.log(`   ${key}: ${orders.length} orders, ${uniqueCustomers} customers`);
    });
    
    // Check delivery dates in orders
    console.log(`\n📅 Delivery Date Analysis:`);
    const dateFormats = {};
    dashboardOrders.slice(0, 20).forEach(order => {
        const deliveryDate = order.delivery_date || order.order?.delivery_date;
        if (deliveryDate) {
            const format = deliveryDate.includes('T') ? 'ISO' : 
                          deliveryDate.includes('-') ? 'YYYY-MM-DD' : 
                          deliveryDate.includes('/') ? 'DD/MM/YYYY' : 'Other';
            dateFormats[format] = (dateFormats[format] || 0) + 1;
        }
    });
    
    console.log(`   Date formats found:`);
    Object.keys(dateFormats).forEach(format => {
        console.log(`      ${format}: ${dateFormats[format]} orders`);
    });
    
    // Sample delivery dates
    console.log(`\n   Sample delivery dates:`);
    dashboardOrders.slice(0, 5).forEach((order, idx) => {
        const deliveryDate = order.delivery_date || order.order?.delivery_date;
        const customer = order.customer_name || order.customer;
        console.log(`      ${idx + 1}. ${customer}: ${deliveryDate || 'N/A'}`);
    });
    
    // Check if API file exists
    console.log(`\n💾 API File Check:`);
    console.log(`   Expected file: orders_${dateStr.replace(/-/g, '-')}.json`);
    console.log(`   (If file exists, you can load it to compare)`);
    
    // Summary
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`API Fetch Result: 396 unique orders (from fetch-orders.sh)`);
    console.log(`Dashboard Memory: ${dashboardOrders.length} orderrows`);
    console.log(`Dashboard Unique: ${uniqueOrderIds.size} unique orders`);
    console.log(`\nDifference: ${396 - uniqueOrderIds.size} orders`);
    
    if (Math.abs(396 - uniqueOrderIds.size) > 10) {
        console.log(`\n⚠️  SIGNIFICANT DIFFERENCE DETECTED!`);
        console.log(`   Possible causes:`);
        console.log(`   1. Date format mismatch (API uses DD-MM-YYYY, Dashboard might use YYYY-MM-DD)`);
        console.log(`   2. Date filtering is excluding some orders`);
        console.log(`   3. Orders are being filtered out by validation`);
        console.log(`   4. Different date being checked`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        apiUniqueOrders: 396,
        dashboardOrderrows: dashboardOrders.length,
        dashboardUniqueOrders: uniqueOrderIds.size,
        byRoute,
        difference: 396 - uniqueOrderIds.size
    };
}

// Auto-load
if (typeof window !== 'undefined') {
    window.checkApiVsDashboard = checkApiVsDashboard;
    console.log('✅ Function loaded. Run: checkApiVsDashboard("2026-02-10")');
}


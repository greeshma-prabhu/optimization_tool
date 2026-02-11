/**
 * ANALYZE DATE MISMATCH
 * Compares API fetch results with Dashboard state to find discrepancies
 * 
 * Usage:
 *   1. Run: ./fetch-orders.sh 10-02-2026
 *   2. Open Dashboard and sync for 2026-02-10
 *   3. Open browser console and run: analyzeDateMismatch()
 */

async function analyzeDateMismatch() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 DATE MISMATCH ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Get Dashboard state
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
    
    // Analyze delivery dates
    const dateFormats = {
        iso: [],      // 2026-02-10T14:00:00.000Z
        dd_mm_yyyy: [], // 10-02-2026
        yyyy_mm_dd: [], // 2026-02-10
        other: []
    };
    
    const uniqueDates = new Set();
    const dateCounts = {};
    
    dashboardOrders.forEach(order => {
        const deliveryDate = order.delivery_date || order.order?.delivery_date;
        if (deliveryDate) {
            uniqueDates.add(deliveryDate);
            
            if (deliveryDate.includes('T')) {
                const datePart = deliveryDate.split('T')[0];
                dateFormats.iso.push(datePart);
                dateCounts[datePart] = (dateCounts[datePart] || 0) + 1;
            } else if (deliveryDate.includes('-') && deliveryDate.length === 10) {
                if (deliveryDate.startsWith('20')) {
                    dateFormats.yyyy_mm_dd.push(deliveryDate);
                } else {
                    dateFormats.dd_mm_yyyy.push(deliveryDate);
                }
                dateCounts[deliveryDate] = (dateCounts[deliveryDate] || 0) + 1;
            } else {
                dateFormats.other.push(deliveryDate);
            }
        }
    });
    
    console.log(`\n📅 Delivery Date Analysis:`);
    console.log(`   Unique delivery dates: ${uniqueDates.size}`);
    console.log(`   Date format breakdown:`);
    console.log(`      ISO (YYYY-MM-DDTHH:MM:SS): ${dateFormats.iso.length}`);
    console.log(`      YYYY-MM-DD: ${dateFormats.yyyy_mm_dd.length}`);
    console.log(`      DD-MM-YYYY: ${dateFormats.dd_mm_yyyy.length}`);
    console.log(`      Other: ${dateFormats.other.length}`);
    
    console.log(`\n   Orders by date:`);
    Object.keys(dateCounts).sort().forEach(date => {
        console.log(`      ${date}: ${dateCounts[date]} orders`);
    });
    
    // Check for 2026-02-10 specifically
    const targetDateISO = '2026-02-10';
    const targetDateDDMM = '10-02-2026';
    
    const ordersForTargetDate = dashboardOrders.filter(order => {
        const deliveryDate = order.delivery_date || order.order?.delivery_date;
        if (!deliveryDate) return false;
        
        const datePart = deliveryDate.includes('T') 
            ? deliveryDate.split('T')[0] 
            : deliveryDate.split(' ')[0];
        
        return datePart === targetDateISO || 
               datePart === targetDateDDMM ||
               deliveryDate.includes(targetDateISO) ||
               deliveryDate.includes(targetDateDDMM);
    });
    
    console.log(`\n🎯 Orders for 2026-02-10 (target date):`);
    console.log(`   Found: ${ordersForTargetDate.length} orders`);
    
    // Check route distribution
    const byRoute = {
        rijnsburg_morning: [],
        aalsmeer_morning: [],
        naaldwijk_morning: [],
        rijnsburg_evening: [],
        aalsmeer_evening: [],
        naaldwijk_evening: [],
        unmatched: []
    };
    
    ordersForTargetDate.forEach(order => {
        const routeKey = order.routeKey || 
                        `${(order.route || '').toLowerCase().replace(/\s+/g, '_')}_${order.period || 'morning'}`;
        if (byRoute[routeKey]) {
            byRoute[routeKey].push(order);
        } else {
            byRoute.unmatched.push(order);
        }
    });
    
    console.log(`\n📋 Orders by Route (for 2026-02-10):`);
    Object.keys(byRoute).forEach(key => {
        const orders = byRoute[key];
        const uniqueCustomers = new Set(orders.map(o => o.customer_name || o.customer)).size;
        const uniqueOrders = new Set(orders.map(o => o.order_id || o.order?.id || o.id)).size;
        console.log(`   ${key}:`);
        console.log(`      Orders: ${orders.length}`);
        console.log(`      Unique Orders: ${uniqueOrders}`);
        console.log(`      Customers: ${uniqueCustomers}`);
    });
    
    // Compare with API fetch result
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📊 COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`API Fetch (fetch-orders.sh 10-02-2026):`);
    console.log(`   Unique Orders: 396`);
    console.log(`   Total Orderrows: ~18,861`);
    console.log(`\nDashboard State:`);
    console.log(`   Total Orders in Memory: ${dashboardOrders.length}`);
    console.log(`   Orders for 2026-02-10: ${ordersForTargetDate.length}`);
    console.log(`   Unique Orders for 2026-02-10: ${new Set(ordersForTargetDate.map(o => o.order_id || o.order?.id || o.id)).size}`);
    
    const difference = 396 - new Set(ordersForTargetDate.map(o => o.order_id || o.order?.id || o.id)).size;
    console.log(`\n⚠️  Difference: ${difference} orders`);
    
    if (Math.abs(difference) > 10) {
        console.log(`\n🔍 POSSIBLE CAUSES:`);
        console.log(`   1. Date format mismatch (API uses DD-MM-YYYY, Dashboard uses YYYY-MM-DD)`);
        console.log(`   2. Date filtering is too strict (orders without delivery_date are excluded)`);
        console.log(`   3. Order validation is filtering out valid orders`);
        console.log(`   4. Business day filter (07:00-07:00) is excluding some orders`);
        console.log(`   5. Dashboard is showing a different date than API fetch`);
        
        console.log(`\n💡 RECOMMENDATIONS:`);
        console.log(`   1. Check if Dashboard date picker is set to 2026-02-10`);
        console.log(`   2. Check console for "Filtered by delivery date" message`);
        console.log(`   3. Check if OrderValidator is filtering orders`);
        console.log(`   4. Load API file directly: loadApiFile('orders_2026-02-10.json')`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        apiUniqueOrders: 396,
        dashboardTotal: dashboardOrders.length,
        dashboardForDate: ordersForTargetDate.length,
        difference,
        byRoute
    };
}

/**
 * Load and analyze API file directly
 */
async function loadApiFile(filename = 'orders_2026-02-10.json') {
    console.log(`\n📂 Loading API file: ${filename}`);
    
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded ${data.length} orderrows from API file`);
        
        // Count unique orders
        const uniqueOrders = new Set();
        const byDate = {};
        
        data.forEach(row => {
            const orderId = row.order_id || row.order?.id || row.id;
            if (orderId) uniqueOrders.add(String(orderId));
            
            const deliveryDate = row.delivery_date || row.order?.delivery_date;
            if (deliveryDate) {
                const datePart = deliveryDate.includes('T') 
                    ? deliveryDate.split('T')[0] 
                    : deliveryDate.split(' ')[0];
                byDate[datePart] = (byDate[datePart] || 0) + 1;
            }
        });
        
        console.log(`\n📊 API File Analysis:`);
        console.log(`   Total Orderrows: ${data.length}`);
        console.log(`   Unique Orders: ${uniqueOrders.size}`);
        console.log(`\n   Orders by Date:`);
        Object.keys(byDate).sort().forEach(date => {
            console.log(`      ${date}: ${byDate[date]} orderrows`);
        });
        
        // Check for 2026-02-10
        const targetDateCount = byDate['2026-02-10'] || byDate['10-02-2026'] || 0;
        console.log(`\n   Orders for 2026-02-10: ${targetDateCount} orderrows`);
        
        return {
            totalOrderrows: data.length,
            uniqueOrders: uniqueOrders.size,
            byDate,
            data
        };
        
    } catch (error) {
        console.error(`❌ Error loading API file:`, error);
        console.log(`\n💡 Make sure:`);
        console.log(`   1. File exists in the same directory as the HTML page`);
        console.log(`   2. File name is correct: ${filename}`);
        console.log(`   3. You ran: ./fetch-orders.sh 10-02-2026`);
        return null;
    }
}

// Auto-load
if (typeof window !== 'undefined') {
    window.analyzeDateMismatch = analyzeDateMismatch;
    window.loadApiFile = loadApiFile;
    console.log('✅ Functions loaded. Run: analyzeDateMismatch() or loadApiFile()');
}


/**
 * FIND MISSING ORDERS
 * Identifies why 396 API orders become 354 displayed orders
 */

function findMissingOrders() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 FINDING MISSING ORDERS (396 → 354)');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Get all orders from memory
    let allOrders = [];
    if (window.appState && window.appState.orders) {
        allOrders = window.appState.orders;
    } else if (window.AppData && window.AppData.orders) {
        allOrders = window.AppData.orders;
    } else {
        const stored = localStorage.getItem('zuidplas_orders');
        if (stored) {
            allOrders = JSON.parse(stored);
        }
    }
    
    console.log(`\n📊 Step 1: Raw Data`);
    console.log(`   Total orderrows in memory: ${allOrders.length}`);
    
    // Count unique orders
    const uniqueOrderIds = new Set();
    const ordersById = {};
    
    allOrders.forEach(order => {
        const id = order.order_id || order.order?.id || order.id;
        if (id) {
            uniqueOrderIds.add(String(id));
            if (!ordersById[String(id)]) {
                ordersById[String(id)] = [];
            }
            ordersById[String(id)].push(order);
        }
    });
    
    console.log(`   Unique orders: ${uniqueOrderIds.size}`);
    
    // Check what's displayed (from cart calculation)
    const cartResult = window.__zuidplas_cart_cache;
    let displayedOrders = [];
    
    if (cartResult && cartResult.orders) {
        displayedOrders = cartResult.orders;
    } else {
        // Try to get from displayed data
        const matchedOrders = allOrders.filter(o => {
            const route = o.route || o.routeKey;
            return route && route !== 'unmatched';
        });
        displayedOrders = matchedOrders;
    }
    
    const displayedOrderIds = new Set();
    displayedOrders.forEach(order => {
        const id = order.order_id || order.order?.id || order.id;
        if (id) displayedOrderIds.add(String(id));
    });
    
    console.log(`\n📊 Step 2: Displayed Orders`);
    console.log(`   Orders used in cart calculation: ${displayedOrders.length}`);
    console.log(`   Unique displayed orders: ${displayedOrderIds.size}`);
    
    // Find missing orders
    const missingOrderIds = [];
    uniqueOrderIds.forEach(id => {
        if (!displayedOrderIds.has(id)) {
            missingOrderIds.push(id);
        }
    });
    
    console.log(`\n❌ Step 3: Missing Orders`);
    console.log(`   Missing: ${missingOrderIds.length} orders`);
    
    if (missingOrderIds.length > 0) {
        console.log(`\n   Missing Order IDs (first 20):`);
        missingOrderIds.slice(0, 20).forEach(id => {
            const orders = ordersById[id] || [];
            const firstOrder = orders[0];
            const customer = firstOrder?.customer_name || firstOrder?.customer || 'Unknown';
            const route = firstOrder?.route || firstOrder?.routeKey || 'unmatched';
            console.log(`      ID: ${id}, Customer: ${customer}, Route: ${route}`);
        });
        
        // Analyze why they're missing
        console.log(`\n🔍 Step 4: Why Missing?`);
        
        const reasons = {
            unmatched: [],
            no_route: [],
            validation_failed: [],
            other: []
        };
        
        missingOrderIds.forEach(id => {
            const orders = ordersById[id] || [];
            const firstOrder = orders[0];
            if (!firstOrder) return;
            
            const route = firstOrder.route || firstOrder.routeKey;
            const customer = firstOrder.customer_name || firstOrder.customer;
            
            if (!route || route === 'unmatched') {
                reasons.unmatched.push({ id, customer });
            } else if (!route) {
                reasons.no_route.push({ id, customer });
            } else {
                reasons.other.push({ id, customer, route });
            }
        });
        
        console.log(`   Unmatched (no route assigned): ${reasons.unmatched.length}`);
        if (reasons.unmatched.length > 0) {
            console.log(`   Examples:`);
            reasons.unmatched.slice(0, 5).forEach(r => {
                console.log(`      - ${r.customer} (ID: ${r.id})`);
            });
        }
        
        console.log(`   No route field: ${reasons.no_route.length}`);
        console.log(`   Other reasons: ${reasons.other.length}`);
        
        // Check route distribution of missing orders
        const missingByRoute = {};
        missingOrderIds.forEach(id => {
            const orders = ordersById[id] || [];
            const firstOrder = orders[0];
            if (firstOrder) {
                const route = firstOrder.route || firstOrder.routeKey || 'unmatched';
                missingByRoute[route] = (missingByRoute[route] || 0) + 1;
            }
        });
        
        console.log(`\n📋 Missing Orders by Route:`);
        Object.keys(missingByRoute).sort().forEach(route => {
            console.log(`   ${route}: ${missingByRoute[route]} orders`);
        });
    }
    
    // Check route matching
    console.log(`\n📊 Step 5: Route Matching Analysis`);
    const routeDistribution = {};
    allOrders.forEach(order => {
        const route = order.route || order.routeKey || 'unmatched';
        routeDistribution[route] = (routeDistribution[route] || 0) + 1;
    });
    
    console.log(`   Orders by route (all orderrows):`);
    Object.keys(routeDistribution).sort().forEach(route => {
        console.log(`      ${route}: ${routeDistribution[route]} orderrows`);
    });
    
    // Summary
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`API Unique Orders: 396`);
    console.log(`Dashboard Memory: ${uniqueOrderIds.size} unique orders`);
    console.log(`Displayed Orders: ${displayedOrderIds.size} unique orders`);
    console.log(`Missing: ${missingOrderIds.length} orders`);
    
    if (missingOrderIds.length === 42) {
        console.log(`\n✅ FOUND THE 42 MISSING ORDERS!`);
        console.log(`   These are likely unmatched orders that are excluded from cart calculation.`);
        console.log(`   Check the "Dump Basket" section on the dashboard.`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        totalUnique: uniqueOrderIds.size,
        displayedUnique: displayedOrderIds.size,
        missing: missingOrderIds.length,
        missingOrderIds: missingOrderIds.slice(0, 20)
    };
}

// Auto-load
if (typeof window !== 'undefined') {
    window.findMissingOrders = findMissingOrders;
    console.log('✅ Function loaded. Run: findMissingOrders()');
}


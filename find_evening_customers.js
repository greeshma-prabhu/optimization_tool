/**
 * FIND EVENING CUSTOMERS IN API
 * Shows all customer names that exist in API for evening orders
 * 
 * Run: findEveningCustomers()
 */

function findEveningCustomers() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 FINDING EVENING CUSTOMERS IN API');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Get all orders
    let orders = [];
    if (window.appState && window.appState.orders) {
        orders = window.appState.orders;
    } else if (window.AppData && window.AppData.orders) {
        orders = window.AppData.orders;
    } else {
        const stored = localStorage.getItem('zuidplas_orders');
        if (stored) {
            orders = JSON.parse(stored);
        }
    }
    
    if (orders.length === 0) {
        console.error('❌ No orders found! Please sync data first.');
        return;
    }
    
    // Get all evening orders
    const eveningOrders = orders.filter(o => (o.period || 'morning') === 'evening');
    console.log(`\n📊 Total evening orders: ${eveningOrders.length}`);
    
    // Group by route
    const byRoute = {
        rijnsburg: [],
        aalsmeer: [],
        naaldwijk: [],
        unknown: []
    };
    
    eveningOrders.forEach(order => {
        const route = (order.route || '').toLowerCase();
        if (route === 'rijnsburg') {
            byRoute.rijnsburg.push(order);
        } else if (route === 'aalsmeer') {
            byRoute.aalsmeer.push(order);
        } else if (route === 'naaldwijk') {
            byRoute.naaldwijk.push(order);
        } else {
            byRoute.unknown.push(order);
        }
    });
    
    // Get unique customers per route
    const getUniqueCustomers = (orders) => {
        const customers = new Set();
        orders.forEach(o => {
            const name = o.customer_name || o.customer || 'Unknown';
            if (name && name !== 'Unknown') {
                customers.add(name);
            }
        });
        return Array.from(customers).sort();
    };
    
    console.log(`\n🌆 Evening customers by route:`);
    
    ['rijnsburg', 'aalsmeer', 'naaldwijk'].forEach(route => {
        const routeOrders = byRoute[route];
        const customers = getUniqueCustomers(routeOrders);
        
        console.log(`\n   ${route.toUpperCase()} EVENING (${routeOrders.length} orders, ${customers.length} unique customers):`);
        if (customers.length > 0) {
            customers.forEach((customer, idx) => {
                const count = routeOrders.filter(o => (o.customer_name || o.customer) === customer).length;
                console.log(`      ${idx + 1}. "${customer}" (${count} orders)`);
            });
        } else {
            console.log(`      ❌ NO CUSTOMERS FOUND`);
        }
    });
    
    // Check unmatched
    if (byRoute.unknown.length > 0) {
        const unknownCustomers = getUniqueCustomers(byRoute.unknown);
        console.log(`\n   UNKNOWN ROUTE (${byRoute.unknown.length} orders, ${unknownCustomers.length} unique customers):`);
        unknownCustomers.slice(0, 20).forEach((customer, idx) => {
            const count = byRoute.unknown.filter(o => (o.customer_name || o.customer) === customer).length;
            console.log(`      ${idx + 1}. "${customer}" (${count} orders)`);
        });
        if (unknownCustomers.length > 20) {
            console.log(`      ... and ${unknownCustomers.length - 20} more`);
        }
    }
    
    // Summary for Aalsmeer (the critical issue)
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('🔴 CRITICAL: AALSMEER EVENING ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const aalsmeerCustomers = getUniqueCustomers(byRoute.aalsmeer);
    if (aalsmeerCustomers.length === 0) {
        console.log('❌ NO CUSTOMERS FOUND IN API FOR AALSMEER EVENING!');
        console.log('\n   Possible reasons:');
        console.log('   1. No orders exist for Aalsmeer evening on this date');
        console.log('   2. Orders exist but route assignment is wrong');
        console.log('   3. Customer names don\'t match route mapping');
        console.log('\n   Check unmatched orders above - they might be Aalsmeer customers');
    } else {
        console.log(`✅ Found ${aalsmeerCustomers.length} customers in API:`);
        aalsmeerCustomers.forEach(customer => {
            console.log(`   - "${customer}"`);
        });
        console.log('\n   These customers need to be added to route-mapping.js');
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        rijnsburg: getUniqueCustomers(byRoute.rijnsburg),
        aalsmeer: getUniqueCustomers(byRoute.aalsmeer),
        naaldwijk: getUniqueCustomers(byRoute.naaldwijk),
        unknown: getUniqueCustomers(byRoute.unknown)
    };
}

// Auto-load
if (typeof window !== 'undefined') {
    window.findEveningCustomers = findEveningCustomers;
    console.log('✅ Function loaded. Run: findEveningCustomers()');
}


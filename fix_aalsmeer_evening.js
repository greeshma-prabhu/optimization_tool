/**
 * CRITICAL DIAGNOSTIC: Find why Aalsmeer Evening is empty
 * Run: fixAalsmeerEvening()
 */

function fixAalsmeerEvening() {
    console.log('\n🔴 CRITICAL: AALSMEER EVENING DIAGNOSTIC');
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
    
    console.log(`\n📊 Total orders in system: ${orders.length}`);
    
    // Get expected Aalsmeer evening customers
    const expectedCustomers = [
        'Akkus', 'Albert Heijn', 'Bloem Fleurtiek', 'By Special Zaterdag', 'By Special',
        'Dobbe', 'Fleura Metz', 'Floral Connection', 'Flower Direct', 'Greenflor',
        'FTC Aalsmeer', 'Guchtenaere', 'Hans Visser SK-SV', 'Hans Visser B-SV',
        'Hans Visser B', 'Hans Visser P-SV', 'Hans Visser P', 'Hoekhuis Aalsmeer',
        'Nijssen', 'Hoorn', 'Trans-Fleur', 'Slootman', 'Verbeek en Bol',
        'Waterdrinker', 'Willemsen', 'Zurel', 'Bosjes', 'Klok Dozen', 'MM Flowers', 'Dijkflora'
    ];
    
    console.log(`\n📋 Expected Aalsmeer Evening customers: ${expectedCustomers.length}`);
    
    // Strategy 1: Find all unique customer names in API
    const allCustomers = [...new Set(orders.map(o => o.customer_name || o.customer || '').filter(Boolean))];
    console.log(`\n🔍 Total unique customers in API: ${allCustomers.length}`);
    
    // Strategy 2: Find customers that MIGHT be Aalsmeer evening (fuzzy match)
    console.log(`\n🔍 Strategy 1: Finding potential Aalsmeer evening customers...`);
    const potentialMatches = [];
    
    allCustomers.forEach(apiName => {
        const apiNameLower = apiName.toLowerCase();
        
        // Check if any expected customer name matches (fuzzy)
        expectedCustomers.forEach(expected => {
            const expectedLower = expected.toLowerCase();
            
            // Direct match
            if (apiNameLower === expectedLower) {
                potentialMatches.push({ apiName, expected, match: 'exact' });
                return;
            }
            
            // Contains match (e.g., "Hans Visser" in "Hans Visser ( AFD SK-SV))")
            if (apiNameLower.includes(expectedLower) || expectedLower.includes(apiNameLower)) {
                potentialMatches.push({ apiName, expected, match: 'contains' });
                return;
            }
            
            // Key word matches
            const keywords = ['akkus', 'albert heijn', 'dobbe', 'fleura', 'floral connection', 
                            'flower direct', 'greenflor', 'hans visser', 'hoekhuis aalsmeer',
                            'nijssen', 'hoorn', 'trans', 'slootman', 'verbeek', 'waterdrinker',
                            'willemsen', 'klok', 'mm flower'];
            
            keywords.forEach(keyword => {
                if (apiNameLower.includes(keyword) && expectedLower.includes(keyword)) {
                    potentialMatches.push({ apiName, expected, match: 'keyword' });
                }
            });
        });
    });
    
    // Remove duplicates
    const uniqueMatches = [];
    const seen = new Set();
    potentialMatches.forEach(m => {
        const key = `${m.apiName}|${m.expected}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMatches.push(m);
        }
    });
    
    console.log(`\n✅ Found ${uniqueMatches.length} potential matches:`);
    uniqueMatches.forEach(m => {
        console.log(`   "${m.apiName}" → Expected: "${m.expected}" (${m.match})`);
    });
    
    // Strategy 3: Check what period these customers are getting
    console.log(`\n🔍 Strategy 2: Checking period assignment for potential matches...`);
    const matchedCustomers = uniqueMatches.map(m => m.apiName);
    const relevantOrders = orders.filter(o => {
        const name = (o.customer_name || o.customer || '').toLowerCase();
        return matchedCustomers.some(m => m.toLowerCase() === name);
    });
    
    console.log(`\n📦 Found ${relevantOrders.length} orders from potential Aalsmeer evening customers`);
    
    // Group by customer and show period/route
    const byCustomer = {};
    relevantOrders.forEach(order => {
        const name = order.customer_name || order.customer || 'Unknown';
        if (!byCustomer[name]) {
            byCustomer[name] = {
                orders: [],
                periods: new Set(),
                routes: new Set(),
                deliveryTimes: []
            };
        }
        byCustomer[name].orders.push(order);
        byCustomer[name].periods.add(order.period || 'unknown');
        byCustomer[name].routes.add(order.route || order.routeKey || 'unmatched');
        
        // Get delivery time
        const time = order.delivery_time || order.order?.delivery_time || 
                    order.delivery_date || order.order?.delivery_date || 'N/A';
        byCustomer[name].deliveryTimes.push(String(time));
    });
    
    console.log(`\n📊 Breakdown by customer:`);
    Object.keys(byCustomer).sort().forEach(name => {
        const data = byCustomer[name];
        const periods = Array.from(data.periods);
        const routes = Array.from(data.routes);
        const times = [...new Set(data.deliveryTimes)].slice(0, 3);
        
        console.log(`\n   "${name}":`);
        console.log(`      Orders: ${data.orders.length}`);
        console.log(`      Periods: ${periods.join(', ')}`);
        console.log(`      Routes: ${routes.join(', ')}`);
        console.log(`      Sample times: ${times.join(', ')}`);
        
        // Check if it's being assigned to morning instead of evening
        if (periods.includes('morning') && !periods.includes('evening')) {
            console.log(`      ⚠️  PROBLEM: Assigned to MORNING but should be EVENING!`);
        }
        if (routes.includes('aalsmeer_morning') && !routes.includes('aalsmeer_evening')) {
            console.log(`      ⚠️  PROBLEM: Assigned to AALSMEER_MORNING but should be AALSMEER_EVENING!`);
        }
    });
    
    // Strategy 4: Check orders with delivery_time >= 15:00 (evening)
    console.log(`\n🔍 Strategy 3: Finding all orders with delivery_time >= 15:00...`);
    const eveningTimeOrders = orders.filter(order => {
        const timeStr = String(order.delivery_time || order.order?.delivery_time || 
                              order.delivery_date || order.order?.delivery_date || '');
        
        // Try to extract hour
        const isoMatch = timeStr.match(/T(\d{1,2}):(\d{2})/);
        if (isoMatch) {
            const hour = parseInt(isoMatch[1], 10);
            return hour >= 15;
        }
        
        const simpleMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (simpleMatch) {
            const hour = parseInt(simpleMatch[1], 10);
            return hour >= 15;
        }
        
        return false;
    });
    
    console.log(`\n✅ Found ${eveningTimeOrders.length} orders with delivery_time >= 15:00`);
    
    // Check which customers these are
    const eveningCustomers = [...new Set(eveningTimeOrders.map(o => o.customer_name || o.customer || '').filter(Boolean))];
    console.log(`\n   Customers with evening delivery times: ${eveningCustomers.length}`);
    eveningCustomers.slice(0, 20).forEach(c => {
        const count = eveningTimeOrders.filter(o => (o.customer_name || o.customer) === c).length;
        console.log(`      - "${c}" (${count} orders)`);
    });
    
    // Strategy 5: Check what route these evening-time orders are assigned to
    console.log(`\n🔍 Strategy 4: Checking route assignment for evening-time orders...`);
    const eveningByRoute = {};
    eveningTimeOrders.forEach(order => {
        const route = order.route || order.routeKey || 'unmatched';
        if (!eveningByRoute[route]) {
            eveningByRoute[route] = [];
        }
        eveningByRoute[route].push(order);
    });
    
    console.log(`\n📊 Evening-time orders by route:`);
    Object.keys(eveningByRoute).sort().forEach(route => {
        const routeOrders = eveningByRoute[route];
        const customers = [...new Set(routeOrders.map(o => o.customer_name || o.customer || ''))];
        console.log(`\n   ${route}: ${routeOrders.length} orders, ${customers.length} customers`);
        if (route === 'aalsmeer_evening') {
            console.log(`      ✅ CORRECTLY assigned to Aalsmeer Evening`);
        } else if (route === 'aalsmeer_morning') {
            console.log(`      ❌ WRONG: Assigned to Aalsmeer MORNING instead of EVENING!`);
            console.log(`      Customers: ${customers.slice(0, 5).join(', ')}...`);
        } else if (route === 'unmatched') {
            console.log(`      ⚠️  UNMATCHED - Need to add to route-mapping.js`);
            console.log(`      Customers: ${customers.slice(0, 5).join(', ')}...`);
        }
    });
    
    // FINAL RECOMMENDATIONS
    console.log(`\n\n🎯 RECOMMENDATIONS:`);
    console.log(`═══════════════════════════════════════════════════════════════════`);
    
    // Find customers that should be added to aalsmeer_evening
    const unmatchedEvening = eveningTimeOrders.filter(o => {
        const route = o.route || o.routeKey || 'unmatched';
        return route === 'unmatched' || route === 'aalsmeer_morning';
    });
    
    if (unmatchedEvening.length > 0) {
        const unmatchedCustomers = [...new Set(unmatchedEvening.map(o => o.customer_name || o.customer || ''))];
        console.log(`\n1. ADD THESE CUSTOMERS TO aalsmeer_evening in route-mapping.js:`);
        unmatchedCustomers.forEach(c => {
            const count = unmatchedEvening.filter(o => (o.customer_name || o.customer) === c).length;
            console.log(`   '${c}',  // ${count} orders`);
        });
    }
    
    // Check period inference
    const morningButShouldBeEvening = eveningTimeOrders.filter(o => {
        return (o.period || 'morning') === 'morning';
    });
    
    if (morningButShouldBeEvening.length > 0) {
        console.log(`\n2. PERIOD INFERENCE ISSUE: ${morningButShouldBeEvening.length} orders have delivery_time >= 15:00 but period='morning'`);
        console.log(`   Check inferPeriodFromOrder() function - it's not detecting evening correctly!`);
    }
    
    console.log(`\n✅ Diagnostic complete!`);
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.fixAalsmeerEvening = fixAalsmeerEvening;
    console.log('✅ Run fixAalsmeerEvening() in console to diagnose Aalsmeer evening issue');
}


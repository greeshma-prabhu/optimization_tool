/**
 * FIND AALSMEER EVENING CUSTOMERS
 * Comprehensive search for Aalsmeer evening customers that might be:
 * - In wrong route (assigned to morning or other routes)
 * - Unmatched
 * - Have different customer names
 * 
 * Run: findAalsmeerEvening()
 */

function findAalsmeerEvening() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 COMPREHENSIVE AALSMEER EVENING SEARCH');
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
    
    console.log(`\n📊 Total orders: ${orders.length}`);
    
    // Get expected Aalsmeer evening customers from mapping
    const expectedCustomers = window.RouteMapping?.CLIENT_ROUTE_MAPPING?.aalsmeer_evening || [];
    console.log(`\n📋 Expected Aalsmeer Evening customers: ${expectedCustomers.length}`);
    console.log(`   Sample: ${expectedCustomers.slice(0, 5).join(', ')}...`);
    
    // Strategy 1: Check all evening orders with delivery_location_id = 32 (Aalsmeer)
    console.log(`\n🔍 Strategy 1: Check orders with delivery_location_id = 32 (Aalsmeer)`);
    const aalsmeerLocationOrders = orders.filter(o => {
        const locId = o.delivery_location_id || o.order?.delivery_location_id;
        return locId === 32;
    });
    
    const eveningAalsmeerLocation = aalsmeerLocationOrders.filter(o => 
        (o.period || 'morning') === 'evening'
    );
    
    console.log(`   Total orders with location_id=32: ${aalsmeerLocationOrders.length}`);
    console.log(`   Evening orders with location_id=32: ${eveningAalsmeerLocation.length}`);
    
    if (eveningAalsmeerLocation.length > 0) {
        const customers = [...new Set(eveningAalsmeerLocation.map(o => o.customer_name || o.customer))];
        console.log(`   ✅ Found ${customers.length} customers:`);
        customers.forEach(c => {
            const count = eveningAalsmeerLocation.filter(o => (o.customer_name || o.customer) === c).length;
            console.log(`      - "${c}" (${count} orders)`);
        });
    } else {
        console.log(`   ❌ No evening orders found with location_id=32`);
    }
    
    // Strategy 2: Check all evening orders assigned to Aalsmeer route
    console.log(`\n🔍 Strategy 2: Check orders assigned to Aalsmeer route`);
    const aalsmeerRouteOrders = orders.filter(o => {
        const route = (o.route || '').toLowerCase();
        return route === 'aalsmeer';
    });
    
    const eveningAalsmeerRoute = aalsmeerRouteOrders.filter(o => 
        (o.period || 'morning') === 'evening'
    );
    
    console.log(`   Total orders with route=aalsmeer: ${aalsmeerRouteOrders.length}`);
    console.log(`   Evening orders with route=aalsmeer: ${eveningAalsmeerRoute.length}`);
    
    if (eveningAalsmeerRoute.length > 0) {
        const customers = [...new Set(eveningAalsmeerRoute.map(o => o.customer_name || o.customer))];
        console.log(`   ✅ Found ${customers.length} customers:`);
        customers.forEach(c => {
            const count = eveningAalsmeerRoute.filter(o => (o.customer_name || o.customer) === c).length;
            console.log(`      - "${c}" (${count} orders)`);
        });
    } else {
        console.log(`   ❌ No evening orders found with route=aalsmeer`);
    }
    
    // Strategy 3: Check all evening orders and see which customers match expected names
    console.log(`\n🔍 Strategy 3: Check all evening orders for expected customer names`);
    const allEveningOrders = orders.filter(o => (o.period || 'morning') === 'evening');
    console.log(`   Total evening orders: ${allEveningOrders.length}`);
    
    const allEveningCustomers = [...new Set(allEveningOrders.map(o => o.customer_name || o.customer))];
    console.log(`   Total unique evening customers: ${allEveningCustomers.length}`);
    
    // Check which expected customers appear in evening orders (any route)
    const foundCustomers = [];
    const missingCustomers = [];
    
    expectedCustomers.forEach(expectedName => {
        const found = allEveningCustomers.find(actual => {
            const actualLower = (actual || '').toLowerCase();
            const expectedLower = expectedName.toLowerCase();
            
            // Check various matching patterns
            return actualLower.includes(expectedLower) ||
                   expectedLower.includes(actualLower) ||
                   actualLower.replace(/bv|b\.v\./gi, '').trim() === expectedLower ||
                   expectedLower === actualLower.replace(/bv|b\.v\./gi, '').trim() ||
                   actualLower.replace(/\s+/g, '') === expectedLower.replace(/\s+/g, '');
        });
        
        if (found) {
            foundCustomers.push({ expected: expectedName, actual: found });
        } else {
            missingCustomers.push(expectedName);
        }
    });
    
    console.log(`\n   ✅ Found ${foundCustomers.length} expected customers in evening orders:`);
    foundCustomers.forEach(f => {
        const orders = allEveningOrders.filter(o => (o.customer_name || o.customer) === f.actual);
        const routes = [...new Set(orders.map(o => (o.route || 'unknown').toLowerCase()))];
        console.log(`      "${f.expected}" → "${f.actual}" (${orders.length} orders, routes: ${routes.join(', ')})`);
    });
    
    console.log(`\n   ❌ Missing ${missingCustomers.length} expected customers:`);
    missingCustomers.slice(0, 10).forEach(name => {
        console.log(`      - "${name}"`);
    });
    if (missingCustomers.length > 10) {
        console.log(`      ... and ${missingCustomers.length - 10} more`);
    }
    
    // Strategy 4: Check unmatched evening orders
    console.log(`\n🔍 Strategy 4: Check unmatched evening orders`);
    const unmatchedEvening = allEveningOrders.filter(o => 
        !o.route || 
        o.route === 'unmatched' || 
        !o.isKnownClient ||
        (o.routeKey && !o.routeKey.includes('evening'))
    );
    
    console.log(`   Unmatched evening orders: ${unmatchedEvening.length}`);
    
    if (unmatchedEvening.length > 0) {
        const unmatchedCustomers = [...new Set(unmatchedEvening.map(o => o.customer_name || o.customer))];
        console.log(`   Unmatched customers: ${unmatchedCustomers.length}`);
        
        // Check if any unmatched customers match expected Aalsmeer names
        const potentialAalsmeer = [];
        unmatchedCustomers.forEach(actual => {
            const match = expectedCustomers.find(expected => {
                const actualLower = (actual || '').toLowerCase();
                const expectedLower = expected.toLowerCase();
                return actualLower.includes(expectedLower) ||
                       expectedLower.includes(actualLower);
            });
            if (match) {
                potentialAalsmeer.push({ expected: match, actual: actual });
            }
        });
        
        if (potentialAalsmeer.length > 0) {
            console.log(`\n   ⚠️  POTENTIAL AALSMEER CUSTOMERS IN UNMATCHED:`);
            potentialAalsmeer.forEach(p => {
                const orders = unmatchedEvening.filter(o => (o.customer_name || o.customer) === p.actual);
                console.log(`      "${p.expected}" → "${p.actual}" (${orders.length} orders)`);
                console.log(`         Location ID: ${orders[0]?.delivery_location_id || orders[0]?.order?.delivery_location_id || 'N/A'}`);
                console.log(`         Route: ${orders[0]?.route || 'N/A'}`);
            });
        }
        
        // Show all unmatched customers
        console.log(`\n   All unmatched evening customers:`);
        unmatchedCustomers.slice(0, 20).forEach(c => {
            const orders = unmatchedEvening.filter(o => (o.customer_name || o.customer) === c);
            const locIds = [...new Set(orders.map(o => o.delivery_location_id || o.order?.delivery_location_id))];
            console.log(`      - "${c}" (${orders.length} orders, location_ids: ${locIds.join(', ')})`);
        });
    }
    
    // Strategy 5: Check morning orders for Aalsmeer evening customers
    console.log(`\n🔍 Strategy 5: Check if Aalsmeer evening customers are in morning route`);
    const aalsmeerMorningOrders = orders.filter(o => {
        const route = (o.route || '').toLowerCase();
        const period = (o.period || 'morning');
        return route === 'aalsmeer' && period === 'morning';
    });
    
    const morningCustomers = [...new Set(aalsmeerMorningOrders.map(o => o.customer_name || o.customer))];
    
    const inMorningButShouldBeEvening = [];
    expectedCustomers.forEach(expected => {
        const found = morningCustomers.find(actual => {
            const actualLower = (actual || '').toLowerCase();
            const expectedLower = expected.toLowerCase();
            return actualLower.includes(expectedLower) ||
                   expectedLower.includes(actualLower);
        });
        if (found) {
            const orders = aalsmeerMorningOrders.filter(o => (o.customer_name || o.customer) === found);
            inMorningButShouldBeEvening.push({ expected: expected, actual: found, orders: orders.length });
        }
    });
    
    if (inMorningButShouldBeEvening.length > 0) {
        console.log(`   ⚠️  FOUND ${inMorningButShouldBeEvening.length} AALSMEER EVENING CUSTOMERS IN MORNING ROUTE:`);
        inMorningButShouldBeEvening.forEach(item => {
            console.log(`      "${item.expected}" → "${item.actual}" (${item.orders} orders in morning!)`);
        });
    } else {
        console.log(`   ✅ No Aalsmeer evening customers found in morning route`);
    }
    
    // Summary
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const issues = [];
    
    if (eveningAalsmeerLocation.length === 0 && eveningAalsmeerRoute.length === 0) {
        issues.push('❌ NO evening orders found with Aalsmeer location_id (32) or route');
    }
    
    if (foundCustomers.length === 0) {
        issues.push('❌ NONE of the expected Aalsmeer evening customers found in any evening orders');
    } else if (foundCustomers.length < expectedCustomers.length) {
        issues.push(`⚠️  Only ${foundCustomers.length}/${expectedCustomers.length} expected customers found`);
    }
    
    if (inMorningButShouldBeEvening.length > 0) {
        issues.push(`⚠️  ${inMorningButShouldBeEvening.length} Aalsmeer evening customers are in MORNING route (period assignment issue!)`);
    }
    
    if (unmatchedEvening.length > 0) {
        issues.push(`⚠️  ${unmatchedEvening.length} evening orders are unmatched (might include Aalsmeer customers)`);
    }
    
    if (issues.length === 0) {
        console.log('✅ No issues found - Aalsmeer evening should be working');
    } else {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        expectedCustomers,
        foundCustomers,
        missingCustomers,
        eveningAalsmeerLocation,
        eveningAalsmeerRoute,
        inMorningButShouldBeEvening,
        unmatchedEvening,
        issues
    };
}

// Auto-load
if (typeof window !== 'undefined') {
    window.findAalsmeerEvening = findAalsmeerEvening;
    console.log('✅ Function loaded. Run: findAalsmeerEvening()');
}


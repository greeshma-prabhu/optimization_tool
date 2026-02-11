/**
 * EVENING ROUTES DIAGNOSTIC TOOL
 * 
 * Run this in browser console to diagnose why evening routes show 0 orders
 * 
 * Usage:
 *   1. Open Dashboard
 *   2. Click "Sync" to load orders
 *   3. Open browser console (F12)
 *   4. Paste this entire file
 *   5. Run: diagnoseEveningRoutes()
 */

function diagnoseEveningRoutes() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 EVENING ROUTES DIAGNOSTIC');
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
    
    // Analyze by period
    const byPeriod = {
        morning: [],
        evening: [],
        unknown: []
    };
    
    orders.forEach(order => {
        const period = order.period || 'unknown';
        if (period === 'morning' || period === 'evening') {
            byPeriod[period].push(order);
        } else {
            byPeriod.unknown.push(order);
        }
    });
    
    console.log(`\n📅 Orders by period:`);
    console.log(`   Morning: ${byPeriod.morning.length}`);
    console.log(`   Evening: ${byPeriod.evening.length}`);
    console.log(`   Unknown: ${byPeriod.unknown.length}`);
    
    // Analyze evening orders by route
    const eveningByRoute = {
        rijnsburg_evening: [],
        aalsmeer_evening: [],
        naaldwijk_evening: [],
        unmatched: []
    };
    
    byPeriod.evening.forEach(order => {
        const routeKey = order.routeKey || `${(order.route || '').toLowerCase()}_${order.period || 'evening'}`;
        if (routeKey in eveningByRoute) {
            eveningByRoute[routeKey].push(order);
        } else {
            eveningByRoute.unmatched.push(order);
        }
    });
    
    console.log(`\n🌆 Evening orders by route:`);
    console.log(`   Rijnsburg Evening: ${eveningByRoute.rijnsburg_evening.length}`);
    console.log(`   Aalsmeer Evening: ${eveningByRoute.aalsmeer_evening.length}`);
    console.log(`   Naaldwijk Evening: ${eveningByRoute.naaldwijk_evening.length}`);
    console.log(`   Unmatched: ${eveningByRoute.unmatched.length}`);
    
    // Check expected customers vs actual
    if (window.RouteMapping && window.RouteMapping.CLIENT_ROUTE_MAPPING) {
        const expected = window.RouteMapping.CLIENT_ROUTE_MAPPING;
        
        console.log(`\n📋 Expected customers (from Excel mapping):`);
        console.log(`   Rijnsburg Evening: ${expected.rijnsburg_evening?.length || 0} customers`);
        console.log(`   Aalsmeer Evening: ${expected.aalsmeer_evening?.length || 0} customers`);
        console.log(`   Naaldwijk Evening: ${expected.naaldwijk_evening?.length || 0} customers`);
        
        // Check which expected customers are in API
        const checkRoute = (routeKey, routeName) => {
            const expectedCustomers = expected[routeKey] || [];
            const actualCustomers = new Set(
                eveningByRoute[routeKey].map(o => o.customer_name || o.customer)
            );
            
            console.log(`\n   ${routeName}:`);
            console.log(`      Expected: ${expectedCustomers.length} customers`);
            console.log(`      Found in API: ${actualCustomers.size} customers`);
            
            // Find matches
            const matched = [];
            const missing = [];
            
            expectedCustomers.forEach(expectedName => {
                const found = Array.from(actualCustomers).find(actual => {
                    const actualLower = actual.toLowerCase();
                    const expectedLower = expectedName.toLowerCase();
                    return actualLower.includes(expectedLower) || 
                           expectedLower.includes(actualLower) ||
                           actualLower.replace(/bv|b\.v\./gi, '').trim() === expectedLower ||
                           expectedLower === actualLower.replace(/bv|b\.v\./gi, '').trim();
                });
                
                if (found) {
                    matched.push({ expected: expectedName, actual: found });
                } else {
                    missing.push(expectedName);
                }
            });
            
            console.log(`      ✅ Matched: ${matched.length}`);
            matched.slice(0, 5).forEach(m => {
                console.log(`         "${m.expected}" → "${m.actual}"`);
            });
            if (matched.length > 5) {
                console.log(`         ... and ${matched.length - 5} more`);
            }
            
            console.log(`      ❌ Missing: ${missing.length}`);
            if (missing.length > 0) {
                missing.slice(0, 10).forEach(name => {
                    console.log(`         "${name}"`);
                });
                if (missing.length > 10) {
                    console.log(`         ... and ${missing.length - 10} more`);
                }
            }
            
            // Check for API customers not in expected list
            const unexpected = Array.from(actualCustomers).filter(actual => {
                return !expectedCustomers.some(expected => {
                    const actualLower = actual.toLowerCase();
                    const expectedLower = expected.toLowerCase();
                    return actualLower.includes(expectedLower) || 
                           expectedLower.includes(actualLower);
                });
            });
            
            if (unexpected.length > 0) {
                console.log(`      ⚠️  Unexpected (in API but not in Excel): ${unexpected.length}`);
                unexpected.slice(0, 5).forEach(name => {
                    console.log(`         "${name}"`);
                });
            }
        };
        
        checkRoute('rijnsburg_evening', 'Rijnsburg Evening');
        checkRoute('aalsmeer_evening', 'Aalsmeer Evening');
        checkRoute('naaldwijk_evening', 'Naaldwijk Evening');
    }
    
    // Check period inference
    console.log(`\n🕐 Period inference check:`);
    const periodIssues = [];
    
    byPeriod.unknown.forEach(order => {
        const customerName = order.customer_name || order.customer || 'Unknown';
        const deliveryTime = order.delivery_time || order.order?.delivery_time || 'N/A';
        const deliveryDate = order.delivery_date || order.order?.delivery_date || 'N/A';
        
        // Try to infer period
        let inferredPeriod = 'unknown';
        if (deliveryTime) {
            const timeMatch = String(deliveryTime).match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                const hour = parseInt(timeMatch[1], 10);
                inferredPeriod = hour >= 15 ? 'evening' : 'morning';
            }
        }
        
        periodIssues.push({
            customer: customerName,
            deliveryTime: deliveryTime,
            inferredPeriod: inferredPeriod,
            route: order.route || 'unknown'
        });
    });
    
    if (periodIssues.length > 0) {
        console.log(`   ⚠️  Found ${periodIssues.length} orders with unknown period:`);
        periodIssues.slice(0, 10).forEach(issue => {
            console.log(`      "${issue.customer}" - Time: ${issue.deliveryTime}, Inferred: ${issue.inferredPeriod}`);
        });
    } else {
        console.log(`   ✅ All orders have period assigned`);
    }
    
    // Summary
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const issues = [];
    
    if (eveningByRoute.aalsmeer_evening.length === 0) {
        issues.push('❌ Aalsmeer Evening has 0 orders - CRITICAL ISSUE');
    }
    
    if (eveningByRoute.rijnsburg_evening.length < 2) {
        issues.push(`⚠️  Rijnsburg Evening has only ${eveningByRoute.rijnsburg_evening.length} orders (expected 2+)`);
    }
    
    if (eveningByRoute.naaldwijk_evening.length < 15) {
        issues.push(`⚠️  Naaldwijk Evening has only ${eveningByRoute.naaldwijk_evening.length} orders (expected 15+)`);
    }
    
    if (byPeriod.unknown.length > 0) {
        issues.push(`⚠️  ${byPeriod.unknown.length} orders have unknown period`);
    }
    
    if (eveningByRoute.unmatched.length > 0) {
        issues.push(`⚠️  ${eveningByRoute.unmatched.length} evening orders are unmatched`);
    }
    
    if (issues.length === 0) {
        console.log('✅ No issues detected!');
    } else {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        totalOrders: orders.length,
        byPeriod,
        eveningByRoute,
        issues
    };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.diagnoseEveningRoutes = diagnoseEveningRoutes;
    console.log('✅ Diagnostic function loaded. Run: diagnoseEveningRoutes()');
}


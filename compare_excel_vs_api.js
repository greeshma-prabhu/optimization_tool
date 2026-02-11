/**
 * COMPARE EXCEL VS API
 * Compares Excel totals (1,438 orders) with API data (396 orders)
 * 
 * Usage: compareExcelVsApi()
 */

function compareExcelVsApi() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 EXCEL VS API COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Excel totals from your calculation
    const excelTotals = {
        morning: {
            rijnsburg: 255,
            aalsmeer: 439,
            naaldwijk: 64,
            total: 758
        },
        evening: {
            rijnsburg: 60,
            aalsmeer: 485,
            naaldwijk: 135,
            total: 680
        },
        grandTotal: 1438
    };
    
    console.log(`\n📋 Excel Totals (from Totaal section):`);
    console.log(`   Morning:`);
    console.log(`      Rijnsburg: ${excelTotals.morning.rijnsburg} orders`);
    console.log(`      Aalsmeer: ${excelTotals.morning.aalsmeer} orders`);
    console.log(`      Naaldwijk: ${excelTotals.morning.naaldwijk} orders`);
    console.log(`      Total: ${excelTotals.morning.total} orders`);
    console.log(`   Evening:`);
    console.log(`      Rijnsburg: ${excelTotals.evening.rijnsburg} orders`);
    console.log(`      Aalsmeer: ${excelTotals.evening.aalsmeer} orders`);
    console.log(`      Naaldwijk: ${excelTotals.evening.naaldwijk} orders`);
    console.log(`      Total: ${excelTotals.evening.total} orders`);
    console.log(`   Grand Total: ${excelTotals.grandTotal} orders`);
    
    // Get API data
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
    
    console.log(`\n📊 API Data:`);
    console.log(`   Total orderrows: ${allOrders.length}`);
    
    // Count unique orders
    const uniqueOrderIds = new Set();
    allOrders.forEach(order => {
        const id = order.order_id || order.order?.id || order.id;
        if (id) uniqueOrderIds.add(String(id));
    });
    console.log(`   Unique orders: ${uniqueOrderIds.size}`);
    
    // Count by route and period
    const apiByRoute = {
        morning: {
            rijnsburg: [],
            aalsmeer: [],
            naaldwijk: []
        },
        evening: {
            rijnsburg: [],
            aalsmeer: [],
            naaldwijk: []
        }
    };
    
    allOrders.forEach(order => {
        const routeKey = order.routeKey || 
                        `${(order.route || '').toLowerCase().replace(/\s+/g, '_')}_${order.period || 'morning'}`;
        const period = order.period || 'morning';
        
        if (routeKey.includes('rijnsburg')) {
            if (period === 'evening' || routeKey.includes('evening')) {
                apiByRoute.evening.rijnsburg.push(order);
            } else {
                apiByRoute.morning.rijnsburg.push(order);
            }
        } else if (routeKey.includes('aalsmeer')) {
            if (period === 'evening' || routeKey.includes('evening')) {
                apiByRoute.evening.aalsmeer.push(order);
            } else {
                apiByRoute.morning.aalsmeer.push(order);
            }
        } else if (routeKey.includes('naaldwijk')) {
            if (period === 'evening' || routeKey.includes('evening')) {
                apiByRoute.evening.naaldwijk.push(order);
            } else {
                apiByRoute.morning.naaldwijk.push(order);
            }
        }
    });
    
    // Count unique orders per route
    const countUnique = (orders) => {
        const ids = new Set();
        orders.forEach(o => {
            const id = o.order_id || o.order?.id || o.id;
            if (id) ids.add(String(id));
        });
        return ids.size;
    };
    
    const apiCounts = {
        morning: {
            rijnsburg: countUnique(apiByRoute.morning.rijnsburg),
            aalsmeer: countUnique(apiByRoute.morning.aalsmeer),
            naaldwijk: countUnique(apiByRoute.morning.naaldwijk),
            total: 0
        },
        evening: {
            rijnsburg: countUnique(apiByRoute.evening.rijnsburg),
            aalsmeer: countUnique(apiByRoute.evening.aalsmeer),
            naaldwijk: countUnique(apiByRoute.evening.naaldwijk),
            total: 0
        }
    };
    
    apiCounts.morning.total = apiCounts.morning.rijnsburg + apiCounts.morning.aalsmeer + apiCounts.morning.naaldwijk;
    apiCounts.evening.total = apiCounts.evening.rijnsburg + apiCounts.evening.aalsmeer + apiCounts.evening.naaldwijk;
    
    console.log(`\n   Morning:`);
    console.log(`      Rijnsburg: ${apiCounts.morning.rijnsburg} unique orders`);
    console.log(`      Aalsmeer: ${apiCounts.morning.aalsmeer} unique orders`);
    console.log(`      Naaldwijk: ${apiCounts.morning.naaldwijk} unique orders`);
    console.log(`      Total: ${apiCounts.morning.total} unique orders`);
    console.log(`   Evening:`);
    console.log(`      Rijnsburg: ${apiCounts.evening.rijnsburg} unique orders`);
    console.log(`      Aalsmeer: ${apiCounts.evening.aalsmeer} unique orders`);
    console.log(`      Naaldwijk: ${apiCounts.evening.naaldwijk} unique orders`);
    console.log(`      Total: ${apiCounts.evening.total} unique orders`);
    console.log(`   Grand Total: ${apiCounts.morning.total + apiCounts.evening.total} unique orders`);
    
    // Calculate differences
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('📉 DIFFERENCES');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const differences = {
        morning: {
            rijnsburg: excelTotals.morning.rijnsburg - apiCounts.morning.rijnsburg,
            aalsmeer: excelTotals.morning.aalsmeer - apiCounts.morning.aalsmeer,
            naaldwijk: excelTotals.morning.naaldwijk - apiCounts.morning.naaldwijk,
            total: excelTotals.morning.total - apiCounts.morning.total
        },
        evening: {
            rijnsburg: excelTotals.evening.rijnsburg - apiCounts.evening.rijnsburg,
            aalsmeer: excelTotals.evening.aalsmeer - apiCounts.evening.aalsmeer,
            naaldwijk: excelTotals.evening.naaldwijk - apiCounts.evening.naaldwijk,
            total: excelTotals.evening.total - apiCounts.evening.total
        }
    };
    
    console.log(`   Morning:`);
    console.log(`      Rijnsburg: ${differences.morning.rijnsburg > 0 ? '❌' : '✅'} ${Math.abs(differences.morning.rijnsburg)} orders ${differences.morning.rijnsburg > 0 ? 'missing' : 'extra'}`);
    console.log(`      Aalsmeer: ${differences.morning.aalsmeer > 0 ? '❌' : '✅'} ${Math.abs(differences.morning.aalsmeer)} orders ${differences.morning.aalsmeer > 0 ? 'missing' : 'extra'}`);
    console.log(`      Naaldwijk: ${differences.morning.naaldwijk > 0 ? '❌' : '✅'} ${Math.abs(differences.morning.naaldwijk)} orders ${differences.morning.naaldwijk > 0 ? 'missing' : 'extra'}`);
    console.log(`      Total: ${differences.morning.total > 0 ? '❌' : '✅'} ${Math.abs(differences.morning.total)} orders ${differences.morning.total > 0 ? 'missing' : 'extra'}`);
    
    console.log(`   Evening:`);
    console.log(`      Rijnsburg: ${differences.evening.rijnsburg > 0 ? '❌' : '✅'} ${Math.abs(differences.evening.rijnsburg)} orders ${differences.evening.rijnsburg > 0 ? 'missing' : 'extra'}`);
    console.log(`      Aalsmeer: ${differences.evening.aalsmeer > 0 ? '❌' : '✅'} ${Math.abs(differences.evening.aalsmeer)} orders ${differences.evening.aalsmeer > 0 ? 'missing' : 'extra'}`);
    console.log(`      Naaldwijk: ${differences.evening.naaldwijk > 0 ? '❌' : '✅'} ${Math.abs(differences.evening.naaldwijk)} orders ${differences.evening.naaldwijk > 0 ? 'missing' : 'extra'}`);
    console.log(`      Total: ${differences.evening.total > 0 ? '❌' : '✅'} ${Math.abs(differences.evening.total)} orders ${differences.evening.total > 0 ? 'missing' : 'extra'}`);
    
    const grandDifference = excelTotals.grandTotal - (apiCounts.morning.total + apiCounts.evening.total);
    console.log(`\n   Grand Total: ${grandDifference > 0 ? '❌' : '✅'} ${Math.abs(grandDifference)} orders ${grandDifference > 0 ? 'missing in API' : 'extra in API'}`);
    
    // Analysis
    console.log(`\n═══════════════════════════════════════════════════════════════════`);
    console.log('🔍 ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    console.log(`\n💡 Possible Explanations:`);
    console.log(`   1. Excel numbers might represent ORDERROWS, not unique orders`);
    console.log(`      - API has ${allOrders.length} orderrows`);
    console.log(`      - Excel has ${excelTotals.grandTotal} (from Totaal)`);
    console.log(`      - Difference: ${Math.abs(excelTotals.grandTotal - allOrders.length)}`);
    
    console.log(`\n   2. Excel numbers might represent CRATES/BOXES, not orders`);
    console.log(`      - Each number in Excel Totaal = number of crates`);
    console.log(`      - Multiple crates = 1 order`);
    
    console.log(`\n   3. API might be missing data`);
    console.log(`      - Date filtering might exclude orders`);
    console.log(`      - Route matching might exclude unmatched orders`);
    console.log(`      - Validation might filter out orders`);
    
    console.log(`\n   4. Excel might include data from different date`);
    console.log(`      - Check if Excel date matches API date`);
    
    // Check orderrows vs unique orders
    const orderrowsPerUnique = allOrders.length / uniqueOrderIds.size;
    console.log(`\n📊 Orderrows vs Unique Orders:`);
    console.log(`   Average orderrows per unique order: ${orderrowsPerUnique.toFixed(2)}`);
    console.log(`   If Excel ${excelTotals.grandTotal} = orderrows:`);
    console.log(`   Expected unique orders: ${Math.round(excelTotals.grandTotal / orderrowsPerUnique)}`);
    
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        excel: excelTotals,
        api: {
            orderrows: allOrders.length,
            uniqueOrders: uniqueOrderIds.size,
            byRoute: apiCounts
        },
        differences,
        analysis: {
            orderrowsPerUnique,
            expectedUniqueFromExcel: Math.round(excelTotals.grandTotal / orderrowsPerUnique)
        }
    };
}

// Auto-load
if (typeof window !== 'undefined') {
    window.compareExcelVsApi = compareExcelVsApi;
    console.log('✅ Function loaded. Run: compareExcelVsApi()');
}


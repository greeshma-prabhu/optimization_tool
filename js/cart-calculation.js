/**
 * ZUIDPLAS CART CALCULATION - SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL FORMULA (from requirements):
 * fust = assembly_amount ÷ bundles_per_fust
 * carts = fust ÷ fust_capacity
 * 
 * DO NOT use stems! DO NOT use total_stems ÷ 72!
 * ONLY use FUST (containers)!
 */

// ═══════════════════════════════════════════════════════════════════
// FUST CAPACITY MAPPING - carts per fust type
// ═══════════════════════════════════════════════════════════════════
const FUST_CAPACITY = {
    '612': 72,  // Gerbera box 12cm (3 layers of 24)
    '614': 72,  // Gerbera mini box (same as 612)
    '575': 32,  // Charge code Fc566 + €0.90
    '902': 40,  // Charge code Fc588 + 0.20 (4 layers of 10)
    '588': 40,  // Medium container (clock trade only)
    '996': 32,  // Small container + small rack
    '856': 20,  // Charge code €6.00
    '821': 40,  // Default fallback
    '999': 40,  // Default for unknown
    'default': 72
};


// Route mapping from delivery_location_id
const LOCATION_ID_TO_ROUTE = {
    32: 'Aalsmeer',
    34: 'Naaldwijk',
    36: 'Rijnsburg'
};

/**
 * Get route from customer name mapping
 * Uses RouteMapping.getRouteForCustomer() which maps client names to routes
 * Falls back to location_id if RouteMapping is not available
 */
function getRoute(order) {
    if (order && order.route) {
        return String(order.route).toLowerCase();
    }
    // Priority 1: Use customer name mapping (more reliable - customer names never change)
    if (window.RouteMapping && window.RouteMapping.getRouteForCustomer) {
        const customerName = order.customer_name || order.order?.customer_name || '';
        const route = window.RouteMapping.getRouteForCustomer(customerName);
        
        // If route is null, customer is unmatched - fall back to location_id
        if (route) {
            // CRITICAL: Normalize to lowercase internally
            return route.toLowerCase();
        }
        // If route is null, customer is unmatched - fall through to location_id fallback
    }
    
    // Fallback: Use location_id (old method, less reliable)
    const locId = order.delivery_location_id || order.order?.delivery_location_id;
    const routeFromLocation = LOCATION_ID_TO_ROUTE[locId];
    if (routeFromLocation) {
        // CRITICAL: Normalize to lowercase internally
        return routeFromLocation.toLowerCase();
    }
    return 'rijnsburg'; // Default (lowercase)
}

/**
 * Get fust type from order properties (code '901')
 */
function getFustType(order) {
    const properties = order.properties || [];
    const fustProperty = properties.find(p => p.code === '901');
    const fustCode = fustProperty?.pivot?.value || fustProperty?.value || '612';
    return fustCode;
}

/**
 * Calculate bundles_per_fust for an orderrow
 * CRITICAL: STRICTLY FUST - ONLY use data from order, NO fallbacks
 * 
 * Priority (from requirements):
 * 1. L11 (stems per bundle) + L13 (stems per container) → bundles_per_container = L13 ÷ L11
 * 2. nr_base_product (stems per container) → bundles_per_container = nr_base_product ÷ 10
 * 3. bundles_per_fust (only if > 1)
 * 
 * If none available, use default 5 (but this should be rare - data should be in API)
 */
function calculateBundlesPerFust(orderrow) {
    const properties = orderrow.properties || [];
    
    // Priority 1: Use L11 (stems per bundle) + L13 (stems per container)
    const L11 = properties.find(p => p.code === 'L11');
    const L13 = properties.find(p => p.code === 'L13');
    
    if (L11 && L13) {
        const stemsPerBundle = parseInt(L11.pivot?.value || L11.value || '0');
        const stemsPerContainer = parseInt(L13.pivot?.value || L13.value || '0');
        
        if (stemsPerBundle > 0 && stemsPerContainer > 0) {
            const bundlesPerContainer = stemsPerContainer / stemsPerBundle;
            return {
                bundlesPerFust: bundlesPerContainer,
                method: 'L11_L13',
                stemsPerBundle: stemsPerBundle,
                stemsPerContainer: stemsPerContainer
            };
        }
    }
    
    // Priority 2: Use nr_base_product (stems per container)
    if (orderrow.nr_base_product && parseInt(orderrow.nr_base_product) > 0) {
        const stemsPerContainer = parseInt(orderrow.nr_base_product);
        const stemsPerBundle = 10; // Standard assumption for nr_base_product
        const bundlesPerContainer = stemsPerContainer / stemsPerBundle;
        return {
            bundlesPerFust: bundlesPerContainer,
            method: 'nr_base_product',
            stemsPerContainer: stemsPerContainer
        };
    }
    
    // Priority 3: Use bundles_per_fust ONLY if > 1 (CRITICAL - from requirements!)
    const bundlesPerFust = orderrow.bundles_per_fust ? parseInt(orderrow.bundles_per_fust) : 0;
    if (bundlesPerFust > 1) {
        return {
            bundlesPerFust: bundlesPerFust,
            method: 'bundles_per_fust'
        };
    }
    // If bundles_per_fust = 1, don't use it (would cause inflation per requirements)
    
    // Last resort: Default 5 (should be rare - API should provide FUST data)
    // This is NOT ideal but needed to calculate all orders
    return {
        bundlesPerFust: 5,
        method: 'default_5'
    };
}

/**
 * Calculate FUST for a single orderrow
 * FORMULA: fust = assembly_amount ÷ bundles_per_fust
 * 
 * CRITICAL: ALWAYS returns a value - uses fust type standards if needed
 */
function calculateFustForOrderrow(orderrow) {
    const assemblyAmount = orderrow.assembly_amount || 0;
    
    if (assemblyAmount === 0) {
        return { totalFust: 0, method: 'zero', bundlesPerFust: 0 };
    }
    
    // This will ALWAYS return a value (uses fust type standards if needed)
    const bundlesPerFustData = calculateBundlesPerFust(orderrow);
    const bundlesPerFust = bundlesPerFustData.bundlesPerFust;
    const totalFust = assemblyAmount / bundlesPerFust;
    
    return {
        totalFust: totalFust,
        bundlesPerFust: bundlesPerFust,
        method: bundlesPerFustData.method
    };
}

function calculateCarts(orders) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 FUST CALCULATION (MORNING + EVENING)');
    console.log(`Input: ${orders.length} total orderrows`);
    console.log('═══════════════════════════════════════════════════════════════════');

    let matchedOrders = orders;
    let unmatchedOrders = [];

    if (window.RouteMapping && window.RouteMapping.separateOrdersByClientMatch) {
        const separation = window.RouteMapping.separateOrdersByClientMatch(orders);
        matchedOrders = separation.matched;
        unmatchedOrders = separation.unmatched;
        window.unmatchedOrders = unmatchedOrders;
    }

    const morningOrders = matchedOrders.filter(o => (o.period || 'morning') === 'morning');
    const eveningOrders = matchedOrders.filter(o => (o.period || 'morning') === 'evening');
    const unmatchedMorning = unmatchedOrders.filter(o => (o.period || 'morning') === 'morning');
    const unmatchedEvening = unmatchedOrders.filter(o => (o.period || 'morning') === 'evening');

    console.log(`✅ Morning orders: ${morningOrders.length}`);
    console.log(`✅ Evening orders: ${eveningOrders.length}`);
    console.log(`⚠️ Unmatched: ${unmatchedOrders.length}`);

    const morningResult = calculateCartsForPeriod(morningOrders, 'morning');
    const eveningResult = calculateCartsForPeriod(eveningOrders, 'evening');

    // VALIDATION: Check for routes with 0 orders (potential issue)
    const validateEveningRoutes = (result) => {
        const expectedRoutes = ['Aalsmeer', 'Naaldwijk', 'Rijnsburg'];
        const issues = [];
        
        expectedRoutes.forEach(routeName => {
            const cartCount = result.byRoute?.[routeName] || 0;
            const orderCount = result.breakdown?.find(b => b.route === routeName)?.orders || 0;
            
            if (cartCount === 0 && orderCount === 0) {
                issues.push({
                    route: routeName,
                    period: result.period,
                    issue: 'ZERO_ORDERS',
                    message: `${routeName} ${result.period} has 0 orders - check customer matching`
                });
            }
        });
        
        if (issues.length > 0) {
            console.warn('⚠️ ROUTE VALIDATION WARNINGS:');
            issues.forEach(issue => {
                console.warn(`   ${issue.route} ${issue.period}: ${issue.message}`);
            });
            console.warn('   → Run diagnoseEveningRoutes() in console for detailed analysis');
        }
        
        return issues;
    };
    
    // Validate both periods
    const morningIssues = validateEveningRoutes(morningResult);
    const eveningIssues = validateEveningRoutes(eveningResult);
    
    // Log critical issues
    if (eveningIssues.length > 0) {
        console.error('❌ EVENING ROUTES WITH ZERO ORDERS:');
        eveningIssues.forEach(issue => {
            console.error(`   ${issue.route} Evening: ${issue.message}`);
        });
    }

    const combinedByRoute = {
        Aalsmeer: (morningResult.byRoute?.Aalsmeer || 0) + (eveningResult.byRoute?.Aalsmeer || 0),
        Naaldwijk: (morningResult.byRoute?.Naaldwijk || 0) + (eveningResult.byRoute?.Naaldwijk || 0),
        Rijnsburg: (morningResult.byRoute?.Rijnsburg || 0) + (eveningResult.byRoute?.Rijnsburg || 0)
    };
    const combinedByRouteInternal = {
        aalsmeer: (morningResult.byRouteInternal?.aalsmeer || 0) + (eveningResult.byRouteInternal?.aalsmeer || 0),
        naaldwijk: (morningResult.byRouteInternal?.naaldwijk || 0) + (eveningResult.byRouteInternal?.naaldwijk || 0),
        rijnsburg: (morningResult.byRouteInternal?.rijnsburg || 0) + (eveningResult.byRouteInternal?.rijnsburg || 0)
    };

    const uniqueOrderIds = new Set([
        ...(morningResult.uniqueOrderIds ? Array.from(morningResult.uniqueOrderIds) : []),
        ...(eveningResult.uniqueOrderIds ? Array.from(eveningResult.uniqueOrderIds) : [])
    ]);
    const uniqueUnmatchedOrderIds = new Set();
    unmatchedOrders.forEach(o => {
        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
        if (orderId) uniqueUnmatchedOrderIds.add(String(orderId));
    });

    return {
        total: (morningResult.total || 0) + (eveningResult.total || 0),
        standard: (morningResult.standard || 0) + (eveningResult.standard || 0),
        danish: (morningResult.danish || 0) + (eveningResult.danish || 0),
        trucks: (morningResult.trucks || 0) + (eveningResult.trucks || 0),
        byRoute: combinedByRoute,
        byRouteInternal: combinedByRouteInternal,
        breakdown: [], // combined breakdown not used; use morning/evening separately
        morning: morningResult,
        evening: eveningResult,
        matchedOrders: [...(morningResult.matchedOrders || []), ...(eveningResult.matchedOrders || [])],
        unmatchedOrders: unmatchedOrders,
        unmatchedMorning: unmatchedMorning,
        unmatchedEvening: unmatchedEvening,
        matchedOrdersCount: uniqueOrderIds.size,
        unmatchedOrdersCount: uniqueUnmatchedOrderIds.size,
        uniqueOrderIds: uniqueOrderIds
    };
}

/**
 * MAIN CALCULATION FUNCTION (PER PERIOD)
 * CRITICAL: Aggregate ALL fust by type per route FIRST, then calculate carts
 * CRITICAL BUSINESS RULE: ONLY process orders from Excel-mapped clients!
 */
function calculateCartsForPeriod(orders, period) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 FUST CALCULATION (EXCEL CLIENTS ONLY - SINGLE SOURCE OF TRUTH)');
    console.log(`Input: ${orders.length} total orderrows`);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('FORMULA: fust = assembly_amount ÷ bundles_per_fust');
    console.log('         carts = fust ÷ fust_capacity');
    console.log('NOT: stems ÷ 72 (WRONG!)');
    console.log('');
    
    // Orders passed in are already matched for this period
    const matchedOrders = orders;
    const unmatchedOrders = [];
    
    // Step 1: Filter valid orders (from matched only)
    const validOrders = matchedOrders.filter(order => {
        const assemblyAmount = order.assembly_amount || 0;
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        const customerId = order.customer_id || order.order?.customer_id;
        
        return assemblyAmount > 0 && locationId && customerId;
    });
    
    console.log(`✅ Valid matched orders: ${validOrders.length} out of ${matchedOrders.length} matched`);
    console.log(`⚠️ Unmatched orders (DUMP BASKET): ${unmatchedOrders.length}`);
    console.log('');
    
    // Track which method is used for bundles_per_fust
    const methodCounts = {
        'L11_L13': 0,
        'nr_base_product': 0,
        'bundles_per_fust': 0,
        'default_5': 0,  // Default when no FUST data (should be rare)
        'zero': 0
    };
    
    // Step 2: Calculate FUST for each orderrow and aggregate by route + fust type + cart type
    // CRITICAL: Sum ALL fust of SAME TYPE in SAME ROUTE FIRST!
    // Also track Danish vs Standard carts separately
    // CRITICAL: Use lowercase route keys internally for consistency
    const fustByRouteAndType = {
        'aalsmeer': {},
        'naaldwijk': {},
        'rijnsburg': {}
    };
    
    // Track Danish cart customers separately
    const fustByRouteAndTypeDanish = {
        'aalsmeer': {},
        'naaldwijk': {},
        'rijnsburg': {}
    };
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('STEP 1: Calculating FUST for each orderrow (ALL orders - STRICTLY FUST!)');
    console.log('FORMULA: fust = assembly_amount ÷ bundles_per_fust');
    console.log('✅ ALL orders calculated using FUST (uses fust type standards if needed)');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    validOrders.forEach((order, idx) => {
        const routeRaw = getRoute(order);
        // CRITICAL: Normalize route to lowercase internally
        const route = routeRaw ? routeRaw.toLowerCase() : 'rijnsburg';
        const fustType = getFustType(order);
        const fustCalc = calculateFustForOrderrow(order);
        const assemblyAmount = order.assembly_amount || 0;
        const customerName = order.customer_name || order.order?.customer_name || '';
        
        // Check if customer uses Danish carts
        const isDanish = window.RouteMapping && window.RouteMapping.usesDanishCarts 
            ? window.RouteMapping.usesDanishCarts(customerName)
            : false;
        
        // Track method usage
        methodCounts[fustCalc.method] = (methodCounts[fustCalc.method] || 0) + 1;
        
        // Aggregate: Sum ALL fust of SAME TYPE in SAME ROUTE
        // Separate Danish and Standard carts
        const targetMap = isDanish ? fustByRouteAndTypeDanish : fustByRouteAndType;
        
        // Ensure route exists in map
        if (!targetMap[route]) {
            targetMap[route] = {};
        }
        if (!targetMap[route][fustType]) {
            targetMap[route][fustType] = 0;
        }
        targetMap[route][fustType] += fustCalc.totalFust;
        
        // Log first 5 orders for debugging
        if (idx < 5) {
            const methodNote = fustCalc.method === 'default_5' ? ` (⚠️ missing FUST data!)` : '';
            console.log(`Order ${idx + 1}: ${assemblyAmount} bunches ÷ ${fustCalc.bundlesPerFust.toFixed(2)} bundles/fust = ${fustCalc.totalFust.toFixed(2)} FUST (type ${fustType}, route ${route}, method: ${fustCalc.method}${methodNote})`);
        }
    });
    
    // Show method usage summary - CRITICAL FOR DEBUGGING!
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 FUST CALCULATION METHOD USAGE (STRICTLY FUST - FROM API DATA!)');
    console.log('═══════════════════════════════════════════════════════════════════');
    const totalWithRealData = (methodCounts.L11_L13 || 0) + (methodCounts.nr_base_product || 0) + (methodCounts.bundles_per_fust || 0);
    const totalWithDefault = methodCounts.default_5 || 0;
    const totalOrders = validOrders.length;
    
    console.log(`   ✅ Using REAL FUST DATA from API: ${totalWithRealData} orders`);
    console.log(`      - L11/L13: ${methodCounts.L11_L13 || 0}`);
    console.log(`      - nr_base_product: ${methodCounts.nr_base_product || 0}`);
    console.log(`      - bundles_per_fust (>1): ${methodCounts.bundles_per_fust || 0}`);
    console.log(`   ⚠️ Using DEFAULT (5) - missing FUST data: ${totalWithDefault} orders`);
    console.log(`   Total orders: ${totalOrders}`);
    
    if (totalWithDefault > 0) {
        const percentage = ((totalWithDefault / totalOrders) * 100).toFixed(1);
        console.warn(`   ⚠️ WARNING: ${totalWithDefault} orders (${percentage}%) missing FUST data - using default 5`);
        console.warn(`   ⚠️ These orders need: L11/L13 properties, nr_base_product, or bundles_per_fust > 1`);
    } else {
        console.log('   ✅ ALL orders have FUST data from API!');
    }
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('STEP 2: Aggregated FUST by route and type (THIS IS THE KEY!)');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Step 3: Calculate carts from aggregated fust
    // CRITICAL: Use lowercase route keys internally, map to display names in UI
    const cartsByRoute = {
        'aalsmeer': 0,
        'naaldwijk': 0,
        'rijnsburg': 0
    };
    
    // Track standard and danish carts separately
    let totalStandardCarts = 0;
    let totalDanishCarts = 0;
    
    const breakdown = [];
    
    Object.entries(fustByRouteAndType).forEach(([route, fustTypes]) => {
        // Map to display name for logging
        const displayRoute = route === 'aalsmeer' ? 'Aalsmeer' : 
                            route === 'naaldwijk' ? 'Naaldwijk' : 
                            route === 'rijnsburg' ? 'Rijnsburg' : route;
        console.log(`\n${displayRoute}:`);
        
        let routeTotalCarts = 0;
        let routeStandardCarts = 0;
        let routeDanishCarts = 0;
        const routeBreakdown = [];
        
        // Calculate carts for each fust type in this route
        Object.entries(fustTypes).forEach(([fustType, totalFust]) => {
            // CRITICAL BUG FIX: Reset routeCartsForThisType INSIDE each fustType loop!
            let routeCartsForThisType = 0;
            
            // Check if there's Danish fust for this route+type
            const danishFust = fustByRouteAndTypeDanish[route]?.[fustType] || 0;
            const standardFust = totalFust - danishFust; // Standard = total - danish
            
            let capacity = FUST_CAPACITY[fustType] || FUST_CAPACITY['default']; // Default capacity
            
            // Calculate Danish carts if any
            if (danishFust > 0 && window.RouteMapping && window.RouteMapping.getCartCapacity) {
                const danishCapacity = window.RouteMapping.getCartCapacity(fustType, true);
                const danishCarts = Math.ceil(danishFust / danishCapacity);
                routeCartsForThisType += danishCarts;
                routeDanishCarts += danishCarts;
                routeBreakdown.push({
                    fustType: `${fustType} (Danish)`,
                    totalFust: parseFloat(danishFust.toFixed(2)),
                    capacity: danishCapacity,
                    carts: danishCarts
                });
            }
            
            // Calculate Standard carts if any (ONLY ONCE - no overlap with Danish)
            if (standardFust > 0) {
                const standardCapacity = window.RouteMapping && window.RouteMapping.getCartCapacity
                    ? window.RouteMapping.getCartCapacity(fustType, false)
                    : (FUST_CAPACITY[fustType] || FUST_CAPACITY['default']);
                const standardCarts = Math.ceil(standardFust / standardCapacity);
                routeCartsForThisType += standardCarts;
                routeStandardCarts += standardCarts;
                capacity = standardCapacity; // For logging
                routeBreakdown.push({
                    fustType: `${fustType} (Standard)`,
                    totalFust: parseFloat(standardFust.toFixed(2)),
                    capacity: standardCapacity,
                    carts: standardCarts
                });
            }
            
            routeTotalCarts += routeCartsForThisType;
            
            // Only log if we calculated carts
            if (routeCartsForThisType > 0) {
                console.log(`  Fust ${fustType}: ${totalFust.toFixed(2)} total FUST ÷ ${capacity} capacity = ${routeCartsForThisType} carts`);
            }
        });
        
        cartsByRoute[route] = routeTotalCarts;
        totalStandardCarts += routeStandardCarts;
        totalDanishCarts += routeDanishCarts;
        
        const routeKey = `${route}_${period || 'morning'}`;
        breakdown.push({
            route: displayRoute, // Use display name in breakdown
            routeKey: routeKey,
            period: period || 'morning',
            carts: routeTotalCarts,
            standardCarts: routeStandardCarts,
            danishCarts: routeDanishCarts,
            fustBreakdown: routeBreakdown
        });
        
        console.log(`  ✅ ${displayRoute} TOTAL: ${routeTotalCarts} carts (Standard: ${routeStandardCarts}, Danish: ${routeDanishCarts})`);
    });
    
    // Source of truth: total = standard + danish
    const totalCarts = totalStandardCarts + totalDanishCarts;
    const totalTrucks = calculateTrucks(totalCarts);
    
    // CRITICAL: Assert that total = standard + danish
    console.assert(totalCarts === totalStandardCarts + totalDanishCarts, 
        `❌ CART COUNT BUG: total (${totalCarts}) !== standard (${totalStandardCarts}) + danish (${totalDanishCarts})`);
    
    // Log route totals for reference (informational only)
    const routeTotalSum = cartsByRoute.aalsmeer + cartsByRoute.naaldwijk + cartsByRoute.rijnsburg;
    if (Math.abs(routeTotalSum - totalCarts) > 0.01) {
        console.log('ℹ️ Route totals (informational):');
        console.log(`   Route sum: ${routeTotalSum} carts`);
        console.log(`   Standard + Danish (source of truth): ${totalCarts} carts`);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ FINAL RESULTS:');
    console.log(`   Aalsmeer: ${cartsByRoute.aalsmeer} carts`);
    console.log(`   Naaldwijk: ${cartsByRoute.naaldwijk} carts`);
    console.log(`   Rijnsburg: ${cartsByRoute.rijnsburg} carts`);
    console.log(`   TOTAL: ${totalCarts} carts (Standard: ${totalStandardCarts} + Danish: ${totalDanishCarts})`);
    console.log(`   Standard: ${totalStandardCarts} carts`);
    console.log(`   Danish: ${totalDanishCarts} carts`);
    console.log(`   ✅ VERIFICATION: ${totalStandardCarts} + ${totalDanishCarts} = ${totalCarts} ✅`);
    console.log(`   TRUCKS: ${totalTrucks}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // CRITICAL: Calculate unique order IDs (Set)
    const uniqueOrderIds = new Set();
    validOrders.forEach(o => {
        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
        if (orderId) uniqueOrderIds.add(String(orderId));
    });
    
    const uniqueUnmatchedOrderIds = new Set();
    unmatchedOrders.forEach(o => {
        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
        if (orderId) uniqueUnmatchedOrderIds.add(String(orderId));
    });
    
    // Map route keys to display names for UI compatibility
    const byRouteDisplay = {
        'Aalsmeer': cartsByRoute.aalsmeer,
        'Naaldwijk': cartsByRoute.naaldwijk,
        'Rijnsburg': cartsByRoute.rijnsburg
    };
    
    return {
        period: period || 'morning',
        total: totalCarts,  // Source of truth: standard + danish
        standard: totalStandardCarts,
        danish: totalDanishCarts,
        trucks: totalTrucks,
        byRoute: byRouteDisplay, // Display names for UI
        byRouteInternal: cartsByRoute, // Lowercase keys for internal use
        breakdown: breakdown,
        matchedOrders: validOrders,  // CRITICAL: Return matched orders for display (ONLY these should be shown)
        unmatchedOrders: unmatchedOrders,  // CRITICAL: Return unmatched orders for DUMP BASKET only
        // CRITICAL: Use uniqueOrderIds.size for order count (not orders.length!)
        matchedOrdersCount: uniqueOrderIds.size,
        unmatchedOrdersCount: uniqueUnmatchedOrderIds.size,
        uniqueOrderIds: uniqueOrderIds // CRITICAL: Store Set for consistency checks
    };
}

/**
 * Calculate trucks needed
 */
function calculateTrucks(totalCarts) {
    return Math.ceil(totalCarts / 17); // 17 carts per truck
}

/**
 * Initialize or get window.AppData (SINGLE SOURCE OF TRUTH)
 * CRITICAL: All pages MUST read only from window.AppData
 */
function initAppData() {
    if (!window.AppData) {
        window.AppData = {
            orders: [],              // matched order rows
            uniqueOrderIds: new Set(), // Set of unique order IDs
            cartResult: null          // from calculateCarts
        };
    }
    return window.AppData;
}

/**
 * Single source of truth function
 * ALL pages must use this to get orders and cart calculation
 * CRITICAL: Populates window.AppData as the SINGLE SOURCE OF TRUTH
 * @param {boolean} forceRefresh - If true, ignore cache and calculate fresh (Dashboard only!)
 */
function getGlobalOrdersAndCarts(forceRefresh = false) {
    // Initialize AppData
    const appData = initAppData();
    console.log('🔍 getGlobalOrdersAndCarts: Getting orders from single source...');
    if (forceRefresh) {
        console.log('   🔄 FORCE REFRESH requested - will calculate fresh (ignoring cache)!');
    }
    
    // Priority 1: Global memory (most reliable, shared across all pages)
    let orders = null;
    if (window.__zuidplas_orders_memory && window.__zuidplas_orders_memory.length > 0) {
        orders = window.__zuidplas_orders_memory;
        console.log(`✅ getGlobalOrdersAndCarts: Found ${orders.length} orders in global memory`);
    }
    // Priority 2: appState
    else if (window.appState && typeof window.appState.getOrders === 'function') {
        orders = window.appState.getOrders();
        if (orders && orders.length > 0) {
            console.log(`✅ getGlobalOrdersAndCarts: Found ${orders.length} orders in appState`);
            window.__zuidplas_orders_memory = orders;
        }
    }
    // Priority 3: localStorage
    else {
        const stored = localStorage.getItem('zuidplas_orders') || localStorage.getItem('cachedOrders');
        if (stored) {
            try {
                orders = JSON.parse(stored);
                console.log(`✅ getGlobalOrdersAndCarts: Found ${orders.length} orders in localStorage`);
                window.__zuidplas_orders_memory = orders;
            } catch (e) {
                console.error('❌ getGlobalOrdersAndCarts: Failed to parse localStorage:', e);
            }
        }
    }
    
    if (!orders || orders.length === 0) {
        console.warn('⚠️ getGlobalOrdersAndCarts: No orders found!');
        return {
            orders: [],
            cartResult: {
                total: 0,
                byRoute: { Aalsmeer: 0, Naaldwijk: 0, Rijnsburg: 0 },
                trucks: 0,
                breakdown: []
            }
        };
    }
    
    // CACHE: Create hash based on order IDs, count, AND date
    // CRITICAL: Include date so different dates don't share cache!
    const orderIds = orders.slice(0, 10).map(o => o.id).join(',') + '...' + orders.slice(-5).map(o => o.id).join(',');
    
    // Normalize date to string format for consistent comparison
    let currentDate = window.__zuidplas_orders_date || null;
    
    // If date is not set, try to get from first order's delivery_date
    if (!currentDate && orders.length > 0) {
        // Check multiple possible date field names
        const firstOrder = orders[0];
        const firstOrderDate = firstOrder.delivery_date || 
                              firstOrder.deliveryDate || 
                              firstOrder.order?.delivery_date || 
                              firstOrder.order?.deliveryDate;
        if (firstOrderDate) {
            try {
                const dateObj = new Date(firstOrderDate);
                if (!isNaN(dateObj.getTime())) {
                    currentDate = dateObj.toISOString().split('T')[0];
                    console.log(`   📅 Date not in memory, extracted from order: ${currentDate}`);
                    console.log(`   📅 Original date value: ${firstOrderDate}`);
                } else {
                    console.warn(`   ⚠️ Invalid date value: ${firstOrderDate}`);
                }
            } catch (e) {
                console.warn(`   ⚠️ Could not parse date from order: ${firstOrderDate}`, e);
            }
        } else {
            console.warn(`   ⚠️ No date field found in first order. Available fields: ${Object.keys(firstOrder).join(', ')}`);
        }
    }
    
    // Normalize date format
    if (currentDate instanceof Date) {
        currentDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    } else if (currentDate && typeof currentDate === 'string' && currentDate.includes('GMT')) {
        // Convert Date string to YYYY-MM-DD
        try {
            currentDate = new Date(currentDate).toISOString().split('T')[0];
        } catch (e) {
            currentDate = String(currentDate);
        }
    } else if (!currentDate) {
        currentDate = 'unknown';
        console.warn(`   ⚠️ WARNING: No date found! Using 'unknown' - cache might be shared across dates!`);
    }
    
    const ordersHash = orders.length + '_' + currentDate + '_' + orderIds;
    
    // CRITICAL: Check forceRefresh FIRST - Dashboard should ALWAYS calculate fresh!
    if (forceRefresh) {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🔄 DASHBOARD: FORCE REFRESH - Calculating FRESH (ignoring cache)');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`   Orders count: ${orders.length}`);
        console.log(`   Current date: ${currentDate}`);
        if (window.__zuidplas_cart_cache) {
            console.log(`   ⚠️ Old cache exists (${window.__zuidplas_cart_cache.cartResult?.total || 'unknown'} carts) - will be OVERWRITTEN`);
        }
        // Skip to calculation - don't check cache at all!
    } else {
        // Only check cache if NOT forceRefresh (other pages)
        // CRITICAL: Check ALL possible cache locations!
        console.log(`🔍 getGlobalOrdersAndCarts: Checking cache in ALL locations...`);
        console.log(`   Orders count: ${orders.length}`);
        console.log(`   Current date: ${currentDate}`);
        
        // Try to find cache in any location
        // CRITICAL: Prioritize window.__zuidplas_cart_cache (Dashboard's cache) FIRST!
        let cachedCartResult = null;
        let cacheSource = null;
        let cacheDate = '';
        
        // CRITICAL: localStorage is the ONLY cache that persists across page navigation.
        // We support multiple keys for robustness:
        // - ZUIDPLAS_CART_<date> (per-date)
        // - ZUIDPLAS_LATEST_CART_DATA (latest)
        // - cachedCartResult (legacy)
        let localStorageCache = null;
        try {
            const perDateKey = `ZUIDPLAS_CART_${currentDate}`;
            const latestKey = 'ZUIDPLAS_LATEST_CART_DATA';
            const legacyKey = 'cachedCartResult';
            const raw =
                localStorage.getItem(perDateKey) ||
                localStorage.getItem(latestKey) ||
                localStorage.getItem(legacyKey);

            if (raw) {
                localStorageCache = JSON.parse(raw);
                const cacheDateFromStorage = localStorageCache.date || '';
                if (cacheDateFromStorage === currentDate) {
                    cachedCartResult = localStorageCache.cartResult;
                    cacheSource = 'localStorage';
                    cacheDate = cacheDateFromStorage;
                    const timestamp = localStorage.getItem('cachedCartResultTimestamp');
                    console.log(`   ✅ Found cache in localStorage for date ${cacheDate}`);
                    console.log(`   Cache result: ${cachedCartResult.total || 'unknown'} carts`);
                    console.log(`   Cached at: ${timestamp || 'unknown'}`);
                } else {
                    console.warn(`   ⚠️ localStorage cache is for different date (${cacheDateFromStorage} vs ${currentDate})`);
                }
            }
        } catch (e) {
            console.warn(`   ⚠️ Could not read from localStorage:`, e);
        }
        
        // Location 1: Primary cache (window.__zuidplas_cart_cache) - DASHBOARD'S CACHE!
        // Check window cache if localStorage didn't have it
        if (!cachedCartResult) {
            const windowCache = window.__zuidplas_cart_cache || window._zuidplas_cart_cache;
            if (windowCache && windowCache.cartResult) {
                cachedCartResult = windowCache.cartResult;
                cacheSource = 'window.__zuidplas_cart_cache';
                cacheDate = windowCache.date || '';
                console.log(`   ✅ Found cache in window.__zuidplas_cart_cache (DASHBOARD'S CACHE)`);
                console.log(`   Cache hash: ${windowCache.ordersHash || 'N/A'}`);
                console.log(`   Cache date: ${cacheDate || 'unknown'}`);
                console.log(`   Cache result: ${cachedCartResult.total || 'unknown'} carts`);
                console.log(`   Cached by: ${windowCache.source || 'unknown'}`);
                console.log(`   Cached at: ${windowCache.timestamp || 'unknown'}`);
                console.log(`   Matched orders: ${windowCache.matchedOrdersCount || 'N/A'}`);
                console.log(`   ✅ USING DASHBOARD'S CACHE - This is the SINGLE SOURCE OF TRUTH!`);
            }
            // Location 2: appState.cartResult (for compatibility)
            else if (window.appState && window.appState.cartResult) {
                cachedCartResult = window.appState.cartResult;
                cacheSource = 'window.appState.cartResult';
                console.log(`   ✅ Found cache in window.appState.cartResult`);
                console.log(`   Cache result: ${cachedCartResult.total || 'unknown'} carts`);
            }
        }
        
        if (!cachedCartResult) {
            console.log(`   ❌ No cache found in ANY location!`);
            console.log(`   Checked: window.__zuidplas_cart_cache, window.appState.cartResult, localStorage`);
        }
        
        console.log(`   Current hash: ${ordersHash}`);
        
        // Normalize cache date for comparison
        if (!cacheDate && window.__zuidplas_cart_cache) {
            cacheDate = window.__zuidplas_cart_cache.date || '';
        }
        if (cacheDate instanceof Date) {
            cacheDate = cacheDate.toISOString().split('T')[0];
        } else if (typeof cacheDate === 'string' && cacheDate.includes('GMT')) {
            try {
                cacheDate = new Date(cacheDate).toISOString().split('T')[0];
            } catch (e) {
                cacheDate = String(cacheDate);
            }
        }
        
        // Use cache if it exists (even if hash doesn't match - Dashboard will recalculate when user syncs)
        if (cachedCartResult) {
            // Check if cache matches (only if we have full cache object)
            let hashMatch = false;
            let countMatch = false;
            let dateMatch = false;
            
            if (window.__zuidplas_cart_cache) {
                hashMatch = window.__zuidplas_cart_cache.ordersHash === ordersHash;
                // CRITICAL: Cache may not have orders array anymore (stores uniqueOrderIds instead)
                // Use ordersCount if available, otherwise skip countMatch check
                if (window.__zuidplas_cart_cache.ordersCount !== undefined) {
                    // Compare unique order counts
                    const currentUniqueCount = appData.uniqueOrderIds.size > 0 
                        ? appData.uniqueOrderIds.size 
                        : (() => {
                            const uniqueIds = new Set();
                            orders.forEach(o => {
                                const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
                                if (orderId) uniqueIds.add(String(orderId));
                            });
                            return uniqueIds.size;
                        })();
                    countMatch = window.__zuidplas_cart_cache.ordersCount === currentUniqueCount;
                } else if (window.__zuidplas_cart_cache.orders && Array.isArray(window.__zuidplas_cart_cache.orders)) {
                    // Fallback: old cache format with orders array
                    countMatch = window.__zuidplas_cart_cache.orders.length === orders.length;
                } else {
                    // Can't verify count - assume it matches
                    countMatch = true;
                }
                dateMatch = cacheDate === currentDate;
            } else {
                // Cache from appState or localStorage - assume it matches (can't verify hash)
                hashMatch = true;
                countMatch = true;
                dateMatch = true;
            }
            
            if (hashMatch && countMatch && dateMatch) {
                // Perfect match - use cache
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`✅ getGlobalOrdersAndCarts: Using CACHED FUST calculation result from ${cacheSource}`);
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`   🔵 This result was calculated using FUST (not stems!)`);
                if (window.__zuidplas_cart_cache) {
                    console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
                    console.log(`   Cached by: ${window.__zuidplas_cart_cache.source || 'unknown'}`);
                    console.log(`   Cached date: ${cacheDate || 'unknown'}`);
                }
                console.log(`   Current date: ${currentDate}`);
                console.log(`   Cached result: ${cachedCartResult.total} carts`);
                console.log(`   Cached breakdown: Aalsmeer=${cachedCartResult.byRoute.Aalsmeer}, Naaldwijk=${cachedCartResult.byRoute.Naaldwijk}, Rijnsburg=${cachedCartResult.byRoute.Rijnsburg}`);
                console.log(`   ✅ Formula used: fust = assembly_amount ÷ bundles_per_fust`);
                console.log(`   ✅ Then: carts = fust ÷ fust_capacity`);
                console.log(`   ✅ NOT: stems ÷ 72 (WRONG!)`);
                console.log('═══════════════════════════════════════════════════════════════════');
                
                // CRITICAL: Update window.AppData from cache
                // Rebuild matchedOrders by filtering the already-loaded orders using cached uniqueOrderIds.
                const cachedUniqueIds = Array.isArray(localStorageCache?.uniqueOrderIds)
                    ? localStorageCache.uniqueOrderIds
                    : [];
                const uniqueIdSet = new Set(cachedUniqueIds.map(id => String(id)));
                
                const matchedOrderRows = uniqueIdSet.size > 0
                    ? orders.filter(o => {
                        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
                        return orderId && uniqueIdSet.has(String(orderId));
                      })
                    : (cachedCartResult.matchedOrders || orders);
                
                appData.orders = matchedOrderRows;
                appData.uniqueOrderIds = uniqueIdSet;
                appData.cartResult = cachedCartResult;
                appData.cartResult.matchedOrders = matchedOrderRows;
                
                // If uniqueOrderIds not in cache, rebuild from orders
                if (appData.uniqueOrderIds.size === 0 && appData.orders.length > 0) {
                    appData.orders.forEach(o => {
                        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
                        if (orderId) appData.uniqueOrderIds.add(String(orderId));
                    });
                }
                
                // CRITICAL: Ensure cartResult has correct matchedOrdersCount from uniqueOrderIds
                if (appData.cartResult) {
                    appData.cartResult.matchedOrdersCount = appData.uniqueOrderIds.size;
                }
                
                console.log(`✅ Using cache: ${appData.cartResult.matchedOrdersCount || appData.uniqueOrderIds.size} unique orders, ${appData.cartResult.total} carts`);
                
                return {
                    orders: appData.orders,
                    cartResult: appData.cartResult
                };
            } else {
                // Cache exists but doesn't match - USE IT ANYWAY (don't recalculate!)
                console.warn('⚠️ WARNING: Cache exists but doesn\'t match current orders/date');
                console.warn(`   Cache date: ${cacheDate || 'unknown'}, Current date: ${currentDate}`);
                console.warn(`   Hash match: ${hashMatch}, Count match: ${countMatch}, Date match: ${dateMatch}`);
                console.warn(`   ⚠️ Using Dashboard's cache anyway - Dashboard will recalculate when you sync!`);
                console.warn(`   ⚠️ Non-Dashboard pages should NEVER recalculate - only Dashboard can!`);
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`✅ getGlobalOrdersAndCarts: Using CACHED FUST calculation result from ${cacheSource} (cache mismatch but using anyway)`);
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`   🔵 This result was calculated using FUST (not stems!)`);
                if (window.__zuidplas_cart_cache) {
                    console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
                    console.log(`   Cached by: ${window.__zuidplas_cart_cache.source || 'unknown'}`);
                    console.log(`   Cached date: ${cacheDate || 'unknown'}`);
                }
                console.log(`   Current date: ${currentDate}`);
                console.log(`   Cached result: ${cachedCartResult.total} carts`);
                console.log(`   Cached breakdown: Aalsmeer=${cachedCartResult.byRoute.Aalsmeer}, Naaldwijk=${cachedCartResult.byRoute.Naaldwijk}, Rijnsburg=${cachedCartResult.byRoute.Rijnsburg}`);
                console.log(`   ✅ Formula used: fust = assembly_amount ÷ bundles_per_fust`);
                console.log(`   ✅ Then: carts = fust ÷ fust_capacity`);
                console.log(`   ✅ NOT: stems ÷ 72 (WRONG!)`);
                console.log('═══════════════════════════════════════════════════════════════════');
                
                // CRITICAL: Update window.AppData from cache
                // Rebuild matchedOrders by filtering the already-loaded orders using cached uniqueOrderIds.
                const cachedUniqueIds2 = Array.isArray(localStorageCache?.uniqueOrderIds)
                    ? localStorageCache.uniqueOrderIds
                    : [];
                const uniqueIdSet2 = new Set(cachedUniqueIds2.map(id => String(id)));
                
                const matchedOrderRows2 = uniqueIdSet2.size > 0
                    ? orders.filter(o => {
                        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
                        return orderId && uniqueIdSet2.has(String(orderId));
                      })
                    : (cachedCartResult.matchedOrders || orders);
                
                appData.orders = matchedOrderRows2;
                appData.uniqueOrderIds = uniqueIdSet2;
                appData.cartResult = cachedCartResult;
                appData.cartResult.matchedOrders = matchedOrderRows2;
                
                // If uniqueOrderIds not in cache, rebuild from orders
                if (appData.uniqueOrderIds.size === 0 && appData.orders.length > 0) {
                    appData.orders.forEach(o => {
                        const orderId = o.order_id || o.order?.id || o.order?.order_id || o.id;
                        if (orderId) appData.uniqueOrderIds.add(String(orderId));
                    });
                }
                
                // CRITICAL: Ensure cartResult has correct matchedOrdersCount from uniqueOrderIds
                if (appData.cartResult) {
                    appData.cartResult.matchedOrdersCount = appData.uniqueOrderIds.size;
                }
                
                console.log(`✅ Using cache: ${appData.cartResult.matchedOrdersCount || appData.uniqueOrderIds.size} unique orders, ${appData.cartResult.total} carts`);
                
                return {
                    orders: appData.orders,
                    cartResult: appData.cartResult
                };
            }
        } else {
            // No cache exists at all
            if (!forceRefresh) {
                // CRITICAL: Non-Dashboard pages should NEVER calculate!
                // They must ONLY read from Dashboard's cache!
                console.error('❌ ERROR: No cache found and this is NOT Dashboard!');
                console.error('❌ Non-Dashboard pages should ONLY read from cache, never calculate!');
                console.error('❌ Please load Dashboard first and click "Sync" or "Refresh Data" to calculate carts!');
                console.error('❌ Returning empty result - Dashboard must calculate first!');
                
                // Return empty result - don't calculate!
                return {
                    orders: orders || [],
                    cartResult: {
                        total: 0,
                        byRoute: {
                            Aalsmeer: 0,
                            Naaldwijk: 0,
                            Rijnsburg: 0
                        },
                        trucks: 0,
                        methodCounts: {},
                        skippedOrdersCount: 0
                    }
                };
            } else {
                // Dashboard with no cache - this is fine, calculate fresh
                console.log('🔄 Dashboard: No cache found - calculating fresh...');
            }
        }
    }
    
    // CRITICAL: Only Dashboard (forceRefresh=true) reaches this point!
    // Calculate carts using the SAME function
    console.log(`🧮 getGlobalOrdersAndCarts: Calculating carts for ${orders.length} orders...`);
    console.log(`   Date: ${currentDate}`);
    console.log(`   🔵 DASHBOARD is calculating FRESH (forceRefresh=true)`);
    console.log(`   ⚠️ This will OVERWRITE any existing cache!`);
    console.log(`   🔵 STARTING FUST CALCULATION NOW...`);
    console.log('');
    
    // CRITICAL: This MUST run the FUST calculation function
    const cartResult = calculateCarts(orders);
    
    console.log('');
    console.log(`✅ FUST CALCULATION COMPLETE!`);
    console.log(`   Result: ${cartResult.total} carts`);
    console.log(`   Breakdown: Aalsmeer=${cartResult.byRoute.Aalsmeer}, Naaldwijk=${cartResult.byRoute.Naaldwijk}, Rijnsburg=${cartResult.byRoute.Rijnsburg}`);
    
    // CRITICAL: Update window.AppData (SINGLE SOURCE OF TRUTH)
    appData.orders = cartResult.matchedOrders || [];
    appData.uniqueOrderIds = cartResult.uniqueOrderIds || new Set();
    appData.cartResult = cartResult;
    
    console.log(`✅ window.AppData updated: ${appData.orders.length} orders, ${appData.uniqueOrderIds.size} unique orders`);
    
    // CACHE the result with timestamp and date
    // CRITICAL: ONLY Dashboard can reach this point and set the cache!
    // CRITICAL: Store ONLY uniqueOrderIds (Array) and cartResult (no raw orders!)
    
    // Only Dashboard (forceRefresh=true) can cache
    const cacheSource = 'Dashboard (forceRefresh=true)';
    console.log(`✅ Dashboard calculated and is caching the result for other pages to use`);
    
    // Ensure date is normalized (YYYY-MM-DD format)
    let normalizedDate = currentDate;
    if (currentDate instanceof Date) {
        normalizedDate = currentDate.toISOString().split('T')[0];
    } else if (typeof currentDate === 'string' && currentDate.includes('GMT')) {
        try {
            normalizedDate = new Date(currentDate).toISOString().split('T')[0];
        } catch (e) {
            normalizedDate = String(currentDate);
        }
    }
    
    // CRITICAL: Convert Set to Array for JSON serialization
    const uniqueOrderIdsArray = Array.from(appData.uniqueOrderIds);
    
    // CRITICAL: Save to MULTIPLE locations for compatibility!
    // Location 1: Primary cache (window.__zuidplas_cart_cache) - DASHBOARD'S CACHE!
    // Save to BOTH variable names to handle any typos
    const cacheObject = {
        ordersHash: ordersHash,
        uniqueOrderIds: uniqueOrderIdsArray, // Store as Array (not Set)
        cartResult: cartResult,
        timestamp: new Date().toISOString(),
        ordersCount: appData.uniqueOrderIds.size, // Use unique count, not orders.length!
        date: normalizedDate,  // CRITICAL: Store normalized date so different dates don't share cache!
        source: cacheSource,
        matchedOrders: cartResult.matchedOrders || orders, // Store matched orders for other pages
        matchedOrdersCount: cartResult.matchedOrdersCount || appData.uniqueOrderIds.size,
        unmatchedOrders: cartResult.unmatchedOrders || []
    };
    // Save to BOTH variable names (handle typo in some places)
    window.__zuidplas_cart_cache = cacheObject;
    window._zuidplas_cart_cache = cacheObject; // Backup with typo name
    
    // Location 2: appState.cartResult (for compatibility with old code)
    if (!window.appState) {
        window.appState = {};
    }
    window.appState.cartResult = cartResult;
    
    // Location 3: localStorage (for persistence across page reloads)
    // CRITICAL: Store ONLY uniqueOrderIds + SLIM cartResult (no matchedOrders arrays; quota risk!)
    try {
        const cartResultForStorage = { ...cartResult };
        delete cartResultForStorage.matchedOrders;
        delete cartResultForStorage.unmatchedOrders;
        delete cartResultForStorage.unmatchedMorning;
        delete cartResultForStorage.unmatchedEvening;
        if (cartResultForStorage.morning) {
            cartResultForStorage.morning = { ...cartResultForStorage.morning };
            delete cartResultForStorage.morning.matchedOrders;
            delete cartResultForStorage.morning.unmatchedOrders;
        }
        if (cartResultForStorage.evening) {
            cartResultForStorage.evening = { ...cartResultForStorage.evening };
            delete cartResultForStorage.evening.matchedOrders;
            delete cartResultForStorage.evening.unmatchedOrders;
        }

        const cacheData = {
            uniqueOrderIds: uniqueOrderIdsArray,
            cartResult: cartResultForStorage,
            timestamp: new Date().toISOString(),
            date: normalizedDate
        };
        localStorage.setItem('cachedCartResult', JSON.stringify(cacheData)); // legacy
        localStorage.setItem(`ZUIDPLAS_CART_${normalizedDate}`, JSON.stringify(cacheData)); // per-date
        localStorage.setItem('ZUIDPLAS_LATEST_CART_DATA', JSON.stringify(cacheData)); // latest
        localStorage.setItem('cachedCartResultTimestamp', new Date().toISOString());
        try {
            sessionStorage.setItem('ZUIDPLAS_SESSION_CART_DATA', JSON.stringify(cacheData));
        } catch (e) {
            // ignore
        }
    } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e);
    }
    
    console.log(`✅ getGlobalOrdersAndCarts: Result calculated and CACHED at ${new Date().toISOString()}`);
    console.log(`   Cached by: ${cacheSource}`);
    console.log(`   Cache hash: ${ordersHash}`);
    console.log(`   Cache date: ${normalizedDate}`);
    console.log(`   Cache unique orders count: ${appData.uniqueOrderIds.size} (NOT ${orders.length} orderrows!)`);
    console.log(`   Cache result: ${cartResult.total} carts`);
    console.log(`   ✅ Saved to 3 locations: window.__zuidplas_cart_cache, window.appState.cartResult, localStorage`);
    console.log(`   ✅ Other pages can now use this cache from ANY location!`);
    console.log(`   Date: ${currentDate}`);
    console.log(`   Total: ${cartResult.total} carts, ${cartResult.trucks} trucks`);
    console.log(`   Aalsmeer: ${cartResult.byRoute.Aalsmeer}, Naaldwijk: ${cartResult.byRoute.Naaldwijk}, Rijnsburg: ${cartResult.byRoute.Rijnsburg}`);
    console.log(`   🔒 This cache is now LOCKED - all pages MUST use this result!`);
    console.log(`   ✅ window.AppData is the SINGLE SOURCE OF TRUTH!`);
    
    return {
        orders: appData.orders,
        cartResult: appData.cartResult
    };
}

/**
 * Clear the cart calculation cache
 */
function clearCartCache() {
    // Clear BOTH variable names (handle typos)
    if (window.__zuidplas_cart_cache) {
        console.log('🗑️ clearCartCache: Clearing cart cache...');
        console.log(`   Old cache had: ${window.__zuidplas_cart_cache.cartResult?.total || 'unknown'} carts`);
        console.log(`   Old cache timestamp: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
        delete window.__zuidplas_cart_cache;
        console.log('✅ Cart cache cleared from window.__zuidplas_cart_cache');
    }
    if (window._zuidplas_cart_cache) {
        delete window._zuidplas_cart_cache;
        console.log('✅ Cart cache cleared from window._zuidplas_cart_cache');
    }
    
    // CRITICAL: Also clear localStorage to prevent fallback to old data
    try {
        localStorage.removeItem('cachedCartResult');
        localStorage.removeItem('cachedCartResultTimestamp');
        console.log('✅ Cart cache cleared from localStorage');
    } catch (e) {
        console.warn('⚠️ Could not clear localStorage:', e);
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CartCalculation = {
        calculateTotalCarts: calculateCarts,
        calculateCarts: calculateCarts,
        calculateTrucks: calculateTrucks,
        getRoute: getRoute,
        getFustType: getFustType,
        FUST_CAPACITY: FUST_CAPACITY,
        getGlobalOrdersAndCarts: getGlobalOrdersAndCarts,
        clearCartCache: clearCartCache,
        initAppData: initAppData
    };
    
    // Initialize AppData on load
    initAppData();
}

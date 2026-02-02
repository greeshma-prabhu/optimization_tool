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
 * Get route from delivery_location_id
 */
function getRoute(order) {
    const locId = order.delivery_location_id || order.order?.delivery_location_id;
    return LOCATION_ID_TO_ROUTE[locId] || 'Aalsmeer';
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
 * CRITICAL: This determines how many bundles fit in one fust container
 * 
 * Priority:
 * 1. L11 (stems per bundle) + L13 (stems per container) → bundles_per_container = L13 ÷ L11
 * 2. nr_base_product (stems per container) → bundles_per_container = nr_base_product ÷ 10
 * 3. bundles_per_fust (only if > 1, otherwise skip)
 * 4. Default: 5 bundles per container
 */
function calculateBundlesPerFust(orderrow) {
    const properties = orderrow.properties || [];
    
    // Priority 1: Use L11 (stems per bundle) + L13 (stems per container)
    const L11 = properties.find(p => p.code === 'L11');
    const L13 = properties.find(p => p.code === 'L13');
    
    if (L11 && L13) {
        const stemsPerBundle = parseInt(L11.pivot?.value || L11.value || '10');
        const stemsPerContainer = parseInt(L13.pivot?.value || L13.value || '100');
        
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
        const stemsPerBundle = 10; // Default assumption
        const bundlesPerContainer = stemsPerContainer / stemsPerBundle;
        return {
            bundlesPerFust: bundlesPerContainer,
            method: 'nr_base_product',
            stemsPerContainer: stemsPerContainer
        };
    }
    
    // Priority 3: Use bundles_per_fust ONLY if > 1 (CRITICAL!)
    const bundlesPerFust = orderrow.bundles_per_fust ? parseInt(orderrow.bundles_per_fust) : 0;
    if (bundlesPerFust > 1) {
        return {
            bundlesPerFust: bundlesPerFust,
            method: 'bundles_per_fust'
        };
    }
    // If bundles_per_fust = 1, SKIP IT (would cause inflation)!
    
    // Priority 4: Default assumption (5 bundles per container)
    return {
        bundlesPerFust: 5,
        method: 'default'
    };
}

/**
 * Calculate FUST for a single orderrow
 * FORMULA: fust = assembly_amount ÷ bundles_per_fust
 */
function calculateFustForOrderrow(orderrow) {
    const assemblyAmount = orderrow.assembly_amount || 0;
    
    if (assemblyAmount === 0) {
        return { totalFust: 0, method: 'zero' };
    }
    
    const bundlesPerFustData = calculateBundlesPerFust(orderrow);
    const bundlesPerFust = bundlesPerFustData.bundlesPerFust;
    const totalFust = assemblyAmount / bundlesPerFust;
    
    return {
        totalFust: totalFust,
        bundlesPerFust: bundlesPerFust,
        method: bundlesPerFustData.method
    };
}

/**
 * MAIN CALCULATION FUNCTION
 * CRITICAL: Aggregate ALL fust by type per route FIRST, then calculate carts
 * 
 * Formula:
 * 1. For each orderrow: fust = assembly_amount ÷ bundles_per_fust
 * 2. Sum ALL fust of SAME TYPE in SAME ROUTE
 * 3. Calculate carts: carts = total_fust ÷ fust_capacity
 */
function calculateCarts(orders) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 FUST CALCULATION (SINGLE SOURCE OF TRUTH)');
    console.log(`Input: ${orders.length} orderrows`);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('FORMULA: fust = assembly_amount ÷ bundles_per_fust');
    console.log('         carts = fust ÷ fust_capacity');
    console.log('NOT: stems ÷ 72 (WRONG!)');
    console.log('');
    
    // Step 1: Filter valid orders
    const validOrders = orders.filter(order => {
        const assemblyAmount = order.assembly_amount || 0;
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        const customerId = order.customer_id || order.order?.customer_id;
        
        return assemblyAmount > 0 && locationId && customerId;
    });
    
    console.log(`✅ Valid orders: ${validOrders.length} out of ${orders.length}`);
    console.log('');
    
    // Step 2: Calculate FUST for each orderrow and aggregate by route + fust type
    // CRITICAL: Sum ALL fust of SAME TYPE in SAME ROUTE FIRST!
    const fustByRouteAndType = {
        'Aalsmeer': {},
        'Naaldwijk': {},
        'Rijnsburg': {}
    };
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('STEP 1: Calculating FUST for each orderrow');
    console.log('FORMULA: fust = assembly_amount ÷ bundles_per_fust');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    validOrders.forEach((order, idx) => {
        const route = getRoute(order);
        const fustType = getFustType(order);
        const fustCalc = calculateFustForOrderrow(order);
        const assemblyAmount = order.assembly_amount || 0;
        
        // Aggregate: Sum ALL fust of SAME TYPE in SAME ROUTE
        if (!fustByRouteAndType[route][fustType]) {
            fustByRouteAndType[route][fustType] = 0;
        }
        fustByRouteAndType[route][fustType] += fustCalc.totalFust;
        
        // Log first 5 orders for debugging
        if (idx < 5) {
            console.log(`Order ${idx + 1}: ${assemblyAmount} bunches ÷ ${fustCalc.bundlesPerFust.toFixed(2)} bundles/fust = ${fustCalc.totalFust.toFixed(2)} FUST (type ${fustType}, route ${route}, method: ${fustCalc.method})`);
        }
    });
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('STEP 2: Aggregated FUST by route and type (THIS IS THE KEY!)');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Step 3: Calculate carts from aggregated fust
    const cartsByRoute = {
        'Aalsmeer': 0,
        'Naaldwijk': 0,
        'Rijnsburg': 0
    };
    
    const breakdown = [];
    
    Object.entries(fustByRouteAndType).forEach(([route, fustTypes]) => {
        console.log(`\n${route}:`);
        
        let routeTotalCarts = 0;
        const routeBreakdown = [];
        
        // Calculate carts for each fust type in this route
        Object.entries(fustTypes).forEach(([fustType, totalFust]) => {
            const capacity = FUST_CAPACITY[fustType] || FUST_CAPACITY['default'];
            // FORMULA: carts = total_fust ÷ fust_capacity
            const carts = Math.ceil(totalFust / capacity);
            
            routeTotalCarts += carts;
            routeBreakdown.push({
                fustType,
                totalFust: parseFloat(totalFust.toFixed(2)),
                capacity,
                carts
            });
            
            console.log(`  Fust ${fustType}: ${totalFust.toFixed(2)} total FUST ÷ ${capacity} capacity = ${carts} carts`);
        });
        
        cartsByRoute[route] = routeTotalCarts;
        breakdown.push({
            route,
            carts: routeTotalCarts,
            fustBreakdown: routeBreakdown
        });
        
        console.log(`  ✅ ${route} TOTAL: ${routeTotalCarts} carts`);
    });
    
    const totalCarts = cartsByRoute.Aalsmeer + cartsByRoute.Naaldwijk + cartsByRoute.Rijnsburg;
    const totalTrucks = calculateTrucks(totalCarts);
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ FINAL RESULTS:');
    console.log(`   Aalsmeer: ${cartsByRoute.Aalsmeer} carts`);
    console.log(`   Naaldwijk: ${cartsByRoute.Naaldwijk} carts`);
    console.log(`   Rijnsburg: ${cartsByRoute.Rijnsburg} carts`);
    console.log(`   TOTAL: ${totalCarts} carts`);
    console.log(`   TRUCKS: ${totalTrucks}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        total: totalCarts,
        trucks: totalTrucks,
        byRoute: cartsByRoute,
        breakdown: breakdown
    };
}

/**
 * Calculate trucks needed
 */
function calculateTrucks(totalCarts) {
    return Math.ceil(totalCarts / 17); // 17 carts per truck
}

/**
 * Single source of truth function
 * ALL pages must use this to get orders and cart calculation
 */
function getGlobalOrdersAndCarts() {
    console.log('🔍 getGlobalOrdersAndCarts: Getting orders from single source...');
    
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
    
    // CACHE: Create better hash based on order IDs and count
    const orderIds = orders.slice(0, 10).map(o => o.id).join(',') + '...' + orders.slice(-5).map(o => o.id).join(',');
    const ordersHash = orders.length + '_' + orderIds;
    
    console.log(`🔍 getGlobalOrdersAndCarts: Checking cache...`);
    console.log(`   Orders count: ${orders.length}`);
    console.log(`   Cache exists? ${!!window.__zuidplas_cart_cache}`);
    if (window.__zuidplas_cart_cache) {
        console.log(`   Cache hash: ${window.__zuidplas_cart_cache.ordersHash}`);
        console.log(`   Cache orders count: ${window.__zuidplas_cart_cache.orders.length}`);
    }
    console.log(`   Current hash: ${ordersHash}`);
    
    if (window.__zuidplas_cart_cache && 
        window.__zuidplas_cart_cache.ordersHash === ordersHash &&
        window.__zuidplas_cart_cache.orders.length === orders.length) {
        console.log('✅ getGlobalOrdersAndCarts: Using CACHED cart result (orders unchanged)');
        console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
        console.log(`   Cached result: ${window.__zuidplas_cart_cache.cartResult.total} carts`);
        console.log(`   Cached breakdown: Aalsmeer=${window.__zuidplas_cart_cache.cartResult.byRoute.Aalsmeer}, Naaldwijk=${window.__zuidplas_cart_cache.cartResult.byRoute.Naaldwijk}, Rijnsburg=${window.__zuidplas_cart_cache.cartResult.byRoute.Rijnsburg}`);
        return {
            orders: orders,
            cartResult: window.__zuidplas_cart_cache.cartResult
        };
    } else {
        if (window.__zuidplas_cart_cache) {
            console.log('🔄 getGlobalOrdersAndCarts: Cache mismatch - recalculating...');
            console.log(`   Cache timestamp: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
            console.log(`   Hash match: ${window.__zuidplas_cart_cache.ordersHash === ordersHash}`);
            console.log(`   Count match: ${window.__zuidplas_cart_cache.orders.length === orders.length}`);
            console.log(`   Cache had: ${window.__zuidplas_cart_cache.cartResult.total} carts`);
        } else {
            console.log('🔄 getGlobalOrdersAndCarts: No cache found - calculating fresh...');
        }
    }
    
    // Calculate carts using the SAME function
    console.log(`🧮 getGlobalOrdersAndCarts: Calculating carts for ${orders.length} orders...`);
    const cartResult = calculateCarts(orders);
    
    // CACHE the result with timestamp
    window.__zuidplas_cart_cache = {
        ordersHash: ordersHash,
        orders: orders,
        cartResult: cartResult,
        timestamp: new Date().toISOString(),
        ordersCount: orders.length
    };
    
    console.log(`✅ getGlobalOrdersAndCarts: Result calculated at ${new Date().toISOString()}`);
    console.log(`   Total: ${cartResult.total} carts, ${cartResult.trucks} trucks`);
    console.log(`   Aalsmeer: ${cartResult.byRoute.Aalsmeer}, Naaldwijk: ${cartResult.byRoute.Naaldwijk}, Rijnsburg: ${cartResult.byRoute.Rijnsburg}`);
    
    return {
        orders: orders,
        cartResult: cartResult
    };
}

/**
 * Clear the cart calculation cache
 */
function clearCartCache() {
    if (window.__zuidplas_cart_cache) {
        console.log('🗑️ clearCartCache: Clearing cart cache...');
        console.log(`   Old cache had: ${window.__zuidplas_cart_cache.cartResult.total} carts`);
        console.log(`   Old cache timestamp: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
        delete window.__zuidplas_cart_cache;
        console.log('✅ Cart cache cleared');
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
        clearCartCache: clearCartCache
    };
}

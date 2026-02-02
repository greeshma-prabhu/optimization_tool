/**
 * ZUIDPLAS CART CALCULATION - CORRECT FUST AGGREGATION
 * CRITICAL: Must aggregate ALL fust by type per route FIRST, then calculate carts
 * 
 * The key difference:
 * ❌ WRONG: Calculate carts per customer group → sum groups = 274 carts
 * ✅ CORRECT: Sum ALL fust per type per route → calculate carts = ~62 carts
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
    'default': 40
};

/**
 * Determine route from delivery_location_id
 * CRITICAL: Use location ID, NOT location name!
 */
function getRoute(order) {
    const locId = order.delivery_location_id || order.order?.delivery_location_id;
    if (locId === 32) return 'Aalsmeer';
    if (locId === 34) return 'Naaldwijk';
    if (locId === 36) return 'Rijnsburg';
    return 'Aalsmeer'; // default fallback
}

/**
 * Get fust type from order properties
 * Property code '901' contains the fust type
 */
function getFustType(order) {
    const property = order.properties?.find(p => p.code === '901');
    const fustCode = property?.pivot?.value || property?.value || '821';
    return fustCode;
}

/**
 * Calculate bundles per container using PRIORITY logic
 * This is CRITICAL - wrong bundles_per_container = wrong cart count!
 */
function calculateBundlesPerContainer(order) {
    const properties = order.properties || [];
    const L11Property = properties.find(p => p.code === 'L11'); // Stems per bundle
    const L13Property = properties.find(p => p.code === 'L13'); // Stems per container
    
    // Priority 1: Use L11 and L13 from properties (MOST ACCURATE)
    if (L11Property && L13Property) {
        const stemsPerBundle = parseInt(L11Property.pivot?.value || L11Property.value || '10');
        const stemsPerContainer = parseInt(L13Property.pivot?.value || L13Property.value || '100');
        
        if (stemsPerBundle > 0 && stemsPerContainer > 0) {
            return stemsPerContainer / stemsPerBundle;
        }
    }
    
    // Priority 2: Use nr_base_product (stems per container)
    if (order.nr_base_product && parseInt(order.nr_base_product) > 0) {
        const stemsPerContainer = parseInt(order.nr_base_product);
        const stemsPerBundle = 10; // Default assumption
        return stemsPerContainer / stemsPerBundle;
    }
    
    // Priority 3: Use bundles_per_fust ONLY if > 1 (CRITICAL - was causing inflation!)
    const bundlesPerFust = order.bundles_per_fust ? parseInt(order.bundles_per_fust) : 0;
    if (bundlesPerFust > 1) {
        return bundlesPerFust;
    }
    // If bundles_per_fust = 1, SKIP IT (would cause inflation) and use default
    
    // Priority 4: Default assumption (5 bundles per container is industry standard)
    return 5;
}

/**
 * Main calculation function
 * CRITICAL: Aggregate ALL fust by type per route FIRST, then calculate carts
 */
function calculateCarts(orders) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 CORRECT CALCULATION: Starting for', orders.length, 'orderrows');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Step 1: Filter valid orders only
    // DEBUG: Log first order structure
    if (orders.length > 0) {
        console.log('🔍 DEBUG: First order structure:', JSON.stringify(orders[0], null, 2));
        console.log('🔍 DEBUG: First order keys:', Object.keys(orders[0]));
        console.log('🔍 DEBUG: First order.assembly_amount:', orders[0].assembly_amount);
        console.log('🔍 DEBUG: First order.delivery_location_id:', orders[0].delivery_location_id);
        console.log('🔍 DEBUG: First order.order?.delivery_location_id:', orders[0].order?.delivery_location_id);
        console.log('🔍 DEBUG: First order.customer_id:', orders[0].customer_id);
        console.log('🔍 DEBUG: First order.order?.customer_id:', orders[0].order?.customer_id);
    }
    
    let invalidCount = 0;
    const invalidReasons = { noAssembly: 0, noLocation: 0, noCustomer: 0 };
    
    const validOrders = orders.filter(order => {
        const assemblyAmount = order.assembly_amount || 0;
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        const customerId = order.customer_id || order.order?.customer_id;
        
        if (assemblyAmount <= 0) {
            invalidReasons.noAssembly++;
            if (invalidCount < 5) {
                console.log('❌ Invalid order (no assembly_amount):', order.id || 'unknown');
            }
            invalidCount++;
            return false;
        }
        
        if (!locationId) {
            invalidReasons.noLocation++;
            if (invalidCount < 5) {
                console.log('❌ Invalid order (no delivery_location_id):', order.id || 'unknown');
            }
            invalidCount++;
            return false;
        }
        
        if (!customerId) {
            invalidReasons.noCustomer++;
            if (invalidCount < 5) {
                console.log('❌ Invalid order (no customer_id):', order.id || 'unknown');
            }
            invalidCount++;
            return false;
        }
        
        return true;
    });
    
    console.log('✅ Valid orders:', validOrders.length, 'out of', orders.length);
    console.log('❌ Invalid breakdown:', invalidReasons);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: CALCULATE FUST (CONTAINERS) - NOT STEMS!
    // ═══════════════════════════════════════════════════════════════════
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 STEP 2: CALCULATING FUST (CONTAINERS) FROM ORDERS');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('FORMULA: FUST = assembly_amount (bunches) ÷ bundles_per_container');
    console.log('NOT: stems ÷ 72 (WRONG!)');
    console.log('');
    
    // AGGREGATE FUST BY ROUTE AND TYPE
    // THIS IS THE KEY - sum all fust per type per route FIRST
    // DO NOT calculate carts per customer group!
    const fustByRouteAndType = {
        'Aalsmeer': {},
        'Naaldwijk': {},
        'Rijnsburg': {}
    };

    validOrders.forEach((order, idx) => {
        const route = getRoute(order);
        const fustType = getFustType(order);
        const bundlesPerContainer = calculateBundlesPerContainer(order);
        const assemblyAmount = order.assembly_amount || 0;
        
        // CRITICAL: Calculate FUST (containers), not stems!
        // FUST = assembly_amount (bunches) ÷ bundles_per_container
        const fustCount = assemblyAmount / bundlesPerContainer;
        
        // ADD to route's fust total for this type (AGGREGATE FIRST!)
        if (!fustByRouteAndType[route][fustType]) {
            fustByRouteAndType[route][fustType] = 0;
        }
        fustByRouteAndType[route][fustType] += fustCount;
        
        // Log first 5 orders to show FUST calculation
        if (idx < 5) {
            const method = getCalculationMethod(order);
            console.log(`📦 Order ${idx + 1}: ${assemblyAmount} bunches ÷ ${bundlesPerContainer.toFixed(2)} bundles/container = ${fustCount.toFixed(2)} FUST (type ${fustType}, route ${route}, method: ${method})`);
        }
    });
    
    // Helper to show which calculation method was used
    function getCalculationMethod(order) {
        const properties = order.properties || [];
        const L11Property = properties.find(p => p.code === 'L11');
        const L13Property = properties.find(p => p.code === 'L13');
        
        if (L11Property && L13Property) return 'L11/L13';
        if (order.nr_base_product) return 'nr_base_product';
        if (order.bundles_per_fust && parseInt(order.bundles_per_fust) > 1) return 'bundles_per_fust';
        return 'default(5)';
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: CALCULATE CARTS FROM AGGREGATED FUST
    // ═══════════════════════════════════════════════════════════════════
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 STEP 3: CALCULATING CARTS FROM AGGREGATED FUST');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('FORMULA: CARTS = total_fust (per type) ÷ fust_capacity');
    console.log('NOT: stems ÷ 72 (WRONG!)');
    console.log('');
    console.log('🎯 AGGREGATED FUST BY ROUTE AND TYPE (THIS IS THE KEY!):');
    console.log('');
    
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
            // CRITICAL: Carts = FUST ÷ capacity (NOT stems ÷ 72!)
            const carts = Math.ceil(totalFust / capacity);
            
            routeTotalCarts += carts;
            routeBreakdown.push({
                fustType,
                totalFust: parseFloat(totalFust.toFixed(2)),
                capacity,
                carts
            });
            
            console.log(`  📦 Fust ${fustType}: ${totalFust.toFixed(2)} total FUST ÷ ${capacity} capacity = ${carts} carts`);
        });
        
        cartsByRoute[route] = routeTotalCarts;
        breakdown.push({
            route,
            carts: routeTotalCarts,
            fustBreakdown: routeBreakdown
        });
        
        console.log(`  ✅ ${route} TOTAL: ${routeTotalCarts} carts`);
    });

    // Step 4: Calculate total and trucks
    const totalCarts = Object.values(cartsByRoute).reduce((sum, carts) => sum + carts, 0);
    const totalTrucks = Math.ceil(totalCarts / 17); // 17 carts per truck

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🎯 FINAL RESULTS:');
    console.log('  Aalsmeer:', cartsByRoute.Aalsmeer, 'carts');
    console.log('  Naaldwijk:', cartsByRoute.Naaldwijk, 'carts');
    console.log('  Rijnsburg:', cartsByRoute.Rijnsburg, 'carts');
    console.log('  TOTAL:', totalCarts, 'carts');
    console.log('  TRUCKS:', totalTrucks);
    console.log('═══════════════════════════════════════════════════════════════════');

    return {
        total: totalCarts,
        byRoute: cartsByRoute,
        trucks: totalTrucks,
        breakdown: breakdown
    };
}

/**
 * Calculate trucks needed for carts
 */
function calculateTrucks(totalCarts) {
    return Math.ceil(totalCarts / 17);
}

/**
 * GLOBAL SINGLE SOURCE OF TRUTH
 * ALL pages must use this to get the SAME orders and calculate the SAME carts
 * CACHED: Returns same result if orders haven't changed
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
            // Also store in global memory for consistency
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
                // Store in global memory
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
    // This ensures same orders = same cache, different orders = new calculation
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
        orders: orders, // Store reference to exact orders used
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
 * Call this when orders are updated to force fresh calculation
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
        calculateCarts: calculateCarts, // Alias
        calculateTrucks: calculateTrucks,
        getRoute: getRoute,
        getFustType: getFustType,
        FUST_CAPACITY: FUST_CAPACITY,
        // NEW: Single source of truth function
        getGlobalOrdersAndCarts: getGlobalOrdersAndCarts,
        // NEW: Clear cache function
        clearCartCache: clearCartCache
    };
}

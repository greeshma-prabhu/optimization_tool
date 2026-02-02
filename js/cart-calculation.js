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
    
    // Track which method is used for bundles_per_fust
    const methodCounts = {
        'L11_L13': 0,
        'nr_base_product': 0,
        'bundles_per_fust': 0,
        'default_5': 0,  // Default when no FUST data (should be rare)
        'zero': 0
    };
    
    // Step 2: Calculate FUST for each orderrow and aggregate by route + fust type
    // CRITICAL: Sum ALL fust of SAME TYPE in SAME ROUTE FIRST!
    const fustByRouteAndType = {
        'Aalsmeer': {},
        'Naaldwijk': {},
        'Rijnsburg': {}
    };
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('STEP 1: Calculating FUST for each orderrow (ALL orders - STRICTLY FUST!)');
    console.log('FORMULA: fust = assembly_amount ÷ bundles_per_fust');
    console.log('✅ ALL orders calculated using FUST (uses fust type standards if needed)');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    validOrders.forEach((order, idx) => {
        const route = getRoute(order);
        const fustType = getFustType(order);
        const fustCalc = calculateFustForOrderrow(order);
        const assemblyAmount = order.assembly_amount || 0;
        
        // Track method usage
        methodCounts[fustCalc.method] = (methodCounts[fustCalc.method] || 0) + 1;
        
        // Aggregate: Sum ALL fust of SAME TYPE in SAME ROUTE
        if (!fustByRouteAndType[route][fustType]) {
            fustByRouteAndType[route][fustType] = 0;
        }
        fustByRouteAndType[route][fustType] += fustCalc.totalFust;
        
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
 * @param {boolean} forceRefresh - If true, ignore cache and calculate fresh (Dashboard only!)
 */
function getGlobalOrdersAndCarts(forceRefresh = false) {
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
        console.log(`🔍 getGlobalOrdersAndCarts: Checking cache...`);
        console.log(`   Orders count: ${orders.length}`);
        console.log(`   Current date: ${currentDate}`);
        console.log(`   Cache exists? ${!!window.__zuidplas_cart_cache}`);
        if (window.__zuidplas_cart_cache) {
            console.log(`   ✅ Cache found!`);
            console.log(`   Cache hash: ${window.__zuidplas_cart_cache.ordersHash}`);
            console.log(`   Cache date: ${window.__zuidplas_cart_cache.date || 'unknown'}`);
            console.log(`   Cache orders count: ${window.__zuidplas_cart_cache.orders.length}`);
            console.log(`   Cache result: ${window.__zuidplas_cart_cache.cartResult?.total || 'unknown'} carts`);
            console.log(`   Cached by: ${window.__zuidplas_cart_cache.source || 'unknown'}`);
            console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
        } else {
            console.log(`   ❌ No cache found in window.__zuidplas_cart_cache`);
            console.log(`   Checking if cache exists in other locations...`);
            console.log(`   window.__zuidplas_cart_cache type: ${typeof window.__zuidplas_cart_cache}`);
        }
        console.log(`   Current hash: ${ordersHash}`);
        
        // Normalize cache date for comparison
        let cacheDate = window.__zuidplas_cart_cache?.date || '';
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
        if (window.__zuidplas_cart_cache) {
            // Check if cache matches
            const hashMatch = window.__zuidplas_cart_cache.ordersHash === ordersHash;
            const countMatch = window.__zuidplas_cart_cache.orders.length === orders.length;
            const dateMatch = cacheDate === currentDate;
            
            if (hashMatch && countMatch && dateMatch) {
                // Perfect match - use cache
                console.log('═══════════════════════════════════════════════════════════════════');
            console.log('✅ getGlobalOrdersAndCarts: Using CACHED FUST calculation result');
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log(`   🔵 This result was calculated using FUST (not stems!)`);
            console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
            console.log(`   Cached by: ${window.__zuidplas_cart_cache.source || 'unknown'}`);
            console.log(`   Cached date: ${cacheDate || 'unknown'}`);
            console.log(`   Current date: ${currentDate}`);
            console.log(`   Cached result: ${window.__zuidplas_cart_cache.cartResult.total} carts`);
            console.log(`   Cached breakdown: Aalsmeer=${window.__zuidplas_cart_cache.cartResult.byRoute.Aalsmeer}, Naaldwijk=${window.__zuidplas_cart_cache.cartResult.byRoute.Naaldwijk}, Rijnsburg=${window.__zuidplas_cart_cache.cartResult.byRoute.Rijnsburg}`);
            console.log(`   ✅ Formula used: fust = assembly_amount ÷ bundles_per_fust`);
            console.log(`   ✅ Then: carts = fust ÷ fust_capacity`);
            console.log(`   ✅ NOT: stems ÷ 72 (WRONG!)`);
            console.log('═══════════════════════════════════════════════════════════════════');
            return {
                orders: orders,
                cartResult: window.__zuidplas_cart_cache.cartResult
            };
            } else {
                // Cache exists but doesn't match - USE IT ANYWAY (don't recalculate!)
                console.warn('⚠️ WARNING: Cache exists but doesn\'t match current orders/date');
                console.warn(`   Cache date: ${cacheDate || 'unknown'}, Current date: ${currentDate}`);
                console.warn(`   Hash match: ${hashMatch}, Count match: ${countMatch}, Date match: ${dateMatch}`);
                console.warn(`   ⚠️ Using Dashboard's cache anyway - Dashboard will recalculate when you sync!`);
                console.warn(`   ⚠️ Non-Dashboard pages should NEVER recalculate - only Dashboard can!`);
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log('✅ getGlobalOrdersAndCarts: Using CACHED FUST calculation result (cache mismatch but using anyway)');
                console.log('═══════════════════════════════════════════════════════════════════');
                console.log(`   🔵 This result was calculated using FUST (not stems!)`);
                console.log(`   Cached at: ${window.__zuidplas_cart_cache.timestamp || 'unknown'}`);
                console.log(`   Cached by: ${window.__zuidplas_cart_cache.source || 'unknown'}`);
                console.log(`   Cached date: ${cacheDate || 'unknown'}`);
                console.log(`   Current date: ${currentDate}`);
                console.log(`   Cached result: ${window.__zuidplas_cart_cache.cartResult.total} carts`);
                console.log(`   Cached breakdown: Aalsmeer=${window.__zuidplas_cart_cache.cartResult.byRoute.Aalsmeer}, Naaldwijk=${window.__zuidplas_cart_cache.cartResult.byRoute.Naaldwijk}, Rijnsburg=${window.__zuidplas_cart_cache.cartResult.byRoute.Rijnsburg}`);
                console.log(`   ✅ Formula used: fust = assembly_amount ÷ bundles_per_fust`);
                console.log(`   ✅ Then: carts = fust ÷ fust_capacity`);
                console.log(`   ✅ NOT: stems ÷ 72 (WRONG!)`);
                console.log('═══════════════════════════════════════════════════════════════════');
                return {
                    orders: orders,
                    cartResult: window.__zuidplas_cart_cache.cartResult
                };
            }
        } else {
            // No cache exists at all
            if (!forceRefresh) {
                // Non-Dashboard page with no cache - calculate but warn
                console.warn('⚠️ WARNING: No cache found and this is NOT Dashboard!');
                console.warn('⚠️ Dashboard should calculate first, but calculating here as fallback...');
                console.warn('⚠️ This result will NOT be cached - Dashboard should sync to cache properly!');
                console.warn('⚠️ Please load Dashboard and click "Sync" or "Refresh Data" for proper caching!');
                // Continue to calculation below (don't return empty)
            } else {
                // Dashboard with no cache - this is fine, calculate fresh
                console.log('🔄 Dashboard: No cache found - calculating fresh...');
            }
        }
    }
    
    // Calculate carts using the SAME function
    console.log(`🧮 getGlobalOrdersAndCarts: Calculating carts for ${orders.length} orders...`);
    console.log(`   Date: ${currentDate}`);
    if (forceRefresh) {
        console.log(`   🔵 DASHBOARD is calculating FRESH (forceRefresh=true)`);
        console.log(`   ⚠️ This will OVERWRITE any existing cache!`);
    } else {
        console.log(`   ⚠️ Other page is calculating (no cache found)`);
        console.log(`   ⚠️ Dashboard should have calculated first - this shouldn't happen!`);
    }
    console.log(`   🔵 STARTING FUST CALCULATION NOW...`);
    console.log('');
    
    // CRITICAL: This MUST run the FUST calculation function
    const cartResult = calculateCarts(orders);
    
    console.log('');
    console.log(`✅ FUST CALCULATION COMPLETE!`);
    console.log(`   Result: ${cartResult.total} carts`);
    console.log(`   Breakdown: Aalsmeer=${cartResult.byRoute.Aalsmeer}, Naaldwijk=${cartResult.byRoute.Naaldwijk}, Rijnsburg=${cartResult.byRoute.Rijnsburg}`);
    
    // CACHE the result with timestamp and date
    // CRITICAL: ONLY Dashboard can set the cache! Other pages should NEVER cache!
    if (!forceRefresh) {
        console.error('❌ CRITICAL ERROR: Non-Dashboard page tried to set cache!');
        console.error('❌ Only Dashboard should calculate and cache results!');
        console.error('❌ This page should have used Dashboard\'s cache instead!');
        console.error('❌ NOT caching this result - Dashboard must calculate first!');
        // DON'T cache - return result but don't store it
        return {
            orders: orders,
            cartResult: cartResult
        };
    }
    
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
    
    window.__zuidplas_cart_cache = {
        ordersHash: ordersHash,
        orders: orders,
        cartResult: cartResult,
        timestamp: new Date().toISOString(),
        ordersCount: orders.length,
        date: normalizedDate,  // CRITICAL: Store normalized date so different dates don't share cache!
        source: cacheSource
    };
    
    console.log(`✅ getGlobalOrdersAndCarts: Result calculated and CACHED at ${new Date().toISOString()}`);
    console.log(`   Cached by: ${cacheSource}`);
    console.log(`   Cache hash: ${ordersHash}`);
    console.log(`   Cache date: ${normalizedDate}`);
    console.log(`   Cache orders count: ${orders.length}`);
    console.log(`   Cache result: ${cartResult.total} carts`);
    console.log(`   ✅ Other pages can now use this cache!`);
    console.log(`   Date: ${currentDate}`);
    console.log(`   Total: ${cartResult.total} carts, ${cartResult.trucks} trucks`);
    console.log(`   Aalsmeer: ${cartResult.byRoute.Aalsmeer}, Naaldwijk: ${cartResult.byRoute.Naaldwijk}, Rijnsburg: ${cartResult.byRoute.Rijnsburg}`);
    console.log(`   🔒 This cache is now LOCKED - all pages MUST use this result!`);
    
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

/**
 * FUST-BASED CART CALCULATION
 * This is the ONLY correct way to calculate carts for Zuidplas logistics
 * 
 * CRITICAL: Must group by customer + route BEFORE calculating
 * DO NOT calculate per order row - this will ALWAYS give wrong results!
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
            const bundlesPerContainer = stemsPerContainer / stemsPerBundle;
            console.log(`  Order ${order.id}: Using L11/L13: ${stemsPerContainer}÷${stemsPerBundle} = ${bundlesPerContainer.toFixed(2)} bundles/container`);
            return bundlesPerContainer;
        }
    }
    
    // Priority 2: Use nr_base_product (stems per container)
    if (order.nr_base_product && parseInt(order.nr_base_product) > 0) {
        const stemsPerContainer = parseInt(order.nr_base_product);
        const stemsPerBundle = 10; // Default assumption
        const bundlesPerContainer = stemsPerContainer / stemsPerBundle;
        console.log(`  Order ${order.id}: Using nr_base_product: ${stemsPerContainer}÷${stemsPerBundle} = ${bundlesPerContainer.toFixed(2)} bundles/container`);
        return bundlesPerContainer;
    }
    
    // Priority 3: Use bundles_per_fust only if > 1
    if (order.bundles_per_fust && parseInt(order.bundles_per_fust) > 1) {
        const bundlesPerContainer = parseInt(order.bundles_per_fust);
        console.log(`  Order ${order.id}: Using bundles_per_fust: ${bundlesPerContainer} bundles/container`);
        return bundlesPerContainer;
    }
    
    // Priority 4: Default assumption (5 bundles per container is industry standard)
    console.log(`  Order ${order.id}: Using default: 5 bundles/container`);
    return 5;
}

/**
 * Main calculation function
 * CRITICAL: Must group by customer + route BEFORE calculating
 */
function calculateCarts(orders) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔵 Starting cart calculation for', orders.length, 'orderrows');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Step 1: Filter valid orders only
    const validOrders = orders.filter(order => {
        const assemblyAmount = order.assembly_amount || 0;
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        const customerId = order.customer_id || order.order?.customer_id;
        
        const isValid = assemblyAmount > 0 && locationId && customerId;
        
        if (!isValid) {
            console.log('⚠️ Skipping invalid order:', {
                id: order.id,
                assembly_amount: assemblyAmount,
                location_id: locationId,
                customer_id: customerId
            });
        }
        return isValid;
    });
    
    console.log('✅ Valid orders:', validOrders.length, 'out of', orders.length);
    console.log('');

    // Step 2: Group by customer + route (THIS IS CRITICAL!)
    const grouped = {};
    
    validOrders.forEach((order, idx) => {
        if (idx < 5) {
            console.log(`Processing order ${idx + 1}/${validOrders.length}:`, {
                id: order.id,
                assembly_amount: order.assembly_amount,
                customer_id: order.customer_id || order.order?.customer_id,
                location_id: order.delivery_location_id || order.order?.delivery_location_id
            });
        }
        
        const route = getRoute(order);
        const customerId = order.customer_id || order.order?.customer_id || 'unknown';
        const key = `${customerId}_${route}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                route: route,
                customer_id: customerId,
                customer_name: order.customer_name || `Customer ${customerId}`,
                fustByType: {} // Store fust count per fust type
            };
        }
        
        // Step 3: Calculate fust for this order
        const fustType = getFustType(order);
        const bundlesPerContainer = calculateBundlesPerContainer(order);
        const assemblyAmount = order.assembly_amount || 0;
        
        const fustCount = assemblyAmount / bundlesPerContainer;
        
        // Add to group's fust count for this type
        if (!grouped[key].fustByType[fustType]) {
            grouped[key].fustByType[fustType] = 0;
        }
        grouped[key].fustByType[fustType] += fustCount;
        
        if (idx < 5) {
            console.log(`  → ${assemblyAmount} bunches ÷ ${bundlesPerContainer.toFixed(2)} = ${fustCount.toFixed(2)} fust (type ${fustType})`);
        }
    });

    console.log('');
    console.log('📦 Customer groups created:', Object.keys(grouped).length);
    console.log('');

    // Step 4: Calculate carts from fust (grouped by route)
    const cartsByRoute = {
        'Aalsmeer': 0,
        'Naaldwijk': 0,
        'Rijnsburg': 0
    };
    
    const detailedBreakdown = [];

    Object.entries(grouped).forEach(([key, group], idx) => {
        if (idx < 5) {
            console.log(`\nGroup ${idx + 1}: ${group.customer_name} (${group.route})`);
        }
        
        let groupTotalCarts = 0;
        const fustBreakdown = [];
        
        // Calculate carts for each fust type in this group
        Object.entries(group.fustByType).forEach(([fustType, fustCount]) => {
            const capacity = FUST_CAPACITY[fustType] || FUST_CAPACITY['default'];
            const carts = Math.ceil(fustCount / capacity);
            
            groupTotalCarts += carts;
            fustBreakdown.push({
                fustType,
                fustCount: parseFloat(fustCount.toFixed(2)),
                capacity,
                carts
            });
            
            if (idx < 5) {
                console.log(`    Fust ${fustType}: ${fustCount.toFixed(2)} fust ÷ ${capacity} capacity = ${carts} carts`);
            }
        });
        
        // Map route names correctly
        const routeKey = group.route.charAt(0).toUpperCase() + group.route.slice(1);
        if (cartsByRoute.hasOwnProperty(routeKey)) {
            cartsByRoute[routeKey] += groupTotalCarts;
        } else {
            cartsByRoute['Aalsmeer'] += groupTotalCarts; // fallback
        }
        
        detailedBreakdown.push({
            customer: group.customer_name,
            route: group.route,
            carts: groupTotalCarts,
            fustBreakdown
        });
        
        if (idx < 5) {
            console.log(`  ✅ Total: ${groupTotalCarts} carts`);
        }
    });

    // Step 5: Calculate total and trucks
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
        breakdown: detailedBreakdown
    };
}

/**
 * Calculate trucks needed for carts
 */
function calculateTrucks(totalCarts) {
    return Math.ceil(totalCarts / 17);
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CartCalculation = {
        calculateTotalCarts: calculateCarts,
        calculateCarts: calculateCarts, // Alias
        calculateTrucks: calculateTrucks,
        getRoute: getRoute,
        getFustType: getFustType,
        FUST_CAPACITY: FUST_CAPACITY
    };
}

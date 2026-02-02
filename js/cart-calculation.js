/**
 * CORRECT CART CALCULATION - Based on Client Feedback Feb 2, 2026
 * 
 * The tool was counting STEMS instead of FUST CONTAINERS
 * This file implements the CORRECT algorithm:
 * 
 * 1. Extract fust info (type, count) from orderrows
 * 2. Group by customer + route
 * 3. Sum fust BY TYPE within each group
 * 4. Calculate carts per fust type using correct capacity
 * 5. Sum total carts
 */

// ═══════════════════════════════════════════════════════════════════
// FUST CAPACITIES (per cart)
// ═══════════════════════════════════════════════════════════════════
const FUST_CAPACITIES = {
    '612': 72,  // Gerbera box 12cm
    '614': 72,  // Gerbera mini box  
    '575': 32,  // Charge code Fc566
    '902': 40,  // Charge code Fc588
    '588': 40,  // Medium container
    '996': 32,  // Small container + rack
    '856': 20,  // Charge code €6.00
    '821': 40,  // Default
    'default': 72
};

// ═══════════════════════════════════════════════════════════════════
// LOCATION ID TO ROUTE MAPPING
// ═══════════════════════════════════════════════════════════════════
const LOCATION_TO_ROUTE = {
    32: 'aalsmeer',
    34: 'naaldwijk',
    36: 'rijnsburg'
};

/**
 * Get route from location ID
 */
function getRouteFromLocationId(locationId) {
    return LOCATION_TO_ROUTE[locationId] || 'rijnsburg'; // Default to rijnsburg
}

/**
 * Extract fust information from orderrow
 */
function extractFustInfo(orderrow) {
    // Get fust type from properties array (property code '901')
    const fustProperty = orderrow.properties?.find(p => p.code === '901');
    const fustCode = fustProperty?.pivot?.value || '612'; // Default to 612
    
    // Get bundles per fust (property code 'L14' or from field)
    let bundlesPerFust = orderrow.bundles_per_fust || orderrow.bundles_per_container;
    
    if (!bundlesPerFust) {
        // Try to extract from properties
        const bundlesProperty = orderrow.properties?.find(p => p.code === 'L14');
        bundlesPerFust = bundlesProperty ? parseInt(bundlesProperty.pivot?.value) : null;
    }
    
    bundlesPerFust = bundlesPerFust || 1; // Default to 1 if not found
    
    // Calculate total fust for this orderrow
    const assemblyAmount = orderrow.assembly_amount || 0;
    const totalFust = assemblyAmount / bundlesPerFust;
    
    // Get customer and location info
    const order = orderrow.order || {};
    const customerId = order.customer_id || orderrow.customer_id;
    const locationId = order.delivery_location_id || orderrow.delivery_location_id;
    const customerName = orderrow.customer_name || `Customer ${customerId}`;
    
    return {
        fustCode: fustCode,
        totalFust: totalFust,
        customerId: customerId,
        locationId: locationId,
        customerName: customerName
    };
}

/**
 * Group orderrows by customer and route
 * Sum fust BY TYPE within each group
 */
function groupOrdersByCustomerAndRoute(enrichedOrderrows) {
    const groups = {};
    
    enrichedOrderrows.forEach(row => {
        const fustInfo = extractFustInfo(row);
        const route = getRouteFromLocationId(fustInfo.locationId);
        const key = `${fustInfo.customerId}_${route}`;
        
        if (!groups[key]) {
            groups[key] = {
                customerId: fustInfo.customerId,
                customerName: fustInfo.customerName,
                route: route,
                fustByType: {}
            };
        }
        
        // Add fust to the group (sum by fust type)
        const fustCode = fustInfo.fustCode;
        groups[key].fustByType[fustCode] = 
            (groups[key].fustByType[fustCode] || 0) + fustInfo.totalFust;
    });
    
    return Object.values(groups);
}

/**
 * Calculate carts for a single group (customer + route)
 */
function calculateCartsForGroup(group) {
    let totalCarts = 0;
    const cartDetails = [];
    
    Object.entries(group.fustByType).forEach(([fustCode, totalFust]) => {
        const capacity = FUST_CAPACITIES[fustCode] || FUST_CAPACITIES['default'];
        const carts = Math.ceil(totalFust / capacity);
        totalCarts += carts;
        
        cartDetails.push({
            fustCode: fustCode,
            totalFust: totalFust,
            capacity: capacity,
            carts: carts
        });
        
        console.log(`  ${group.customerName} - ${group.route}: ${totalFust.toFixed(1)} fust of type ${fustCode} = ${carts} carts (capacity: ${capacity})`);
    });
    
    return {
        totalCarts: totalCarts,
        cartDetails: cartDetails
    };
}

/**
 * MAIN FUNCTION: Calculate total carts using CORRECT algorithm
 */
function calculateTotalCarts(enrichedOrderrows) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🛒 CALCULATING CARTS - CORRECT ALGORITHM (FUST-BASED)');
    console.log(`📦 Input: ${enrichedOrderrows.length} orderrows`);
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Group by customer + route
    const groups = groupOrdersByCustomerAndRoute(enrichedOrderrows);
    console.log(`👥 Grouped into ${groups.length} customer-route combinations`);
    console.log('');
    
    // Calculate carts per group
    let totalCarts = 0;
    const cartsByRoute = { rijnsburg: 0, aalsmeer: 0, naaldwijk: 0 };
    const groupDetails = [];
    
    groups.forEach((group, idx) => {
        if (idx < 10) { // Log first 10 groups
            console.log(`Group ${idx + 1}: ${group.customerName} → ${group.route}`);
        }
        
        const result = calculateCartsForGroup(group);
        totalCarts += result.totalCarts;
        cartsByRoute[group.route] += result.totalCarts;
        
        groupDetails.push({
            ...group,
            totalCarts: result.totalCarts,
            cartDetails: result.cartDetails
        });
        
        if (idx < 10) {
            console.log(`  → Total carts for this group: ${result.totalCarts}`);
            console.log('');
        }
    });
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`✅ TOTAL CARTS: ${totalCarts}`);
    console.log(`   Rijnsburg: ${cartsByRoute.rijnsburg} carts`);
    console.log(`   Aalsmeer: ${cartsByRoute.aalsmeer} carts`);
    console.log(`   Naaldwijk: ${cartsByRoute.naaldwijk} carts`);
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return {
        totalCarts: totalCarts,
        cartsByRoute: cartsByRoute,
        groups: groupDetails
    };
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CartCalculation = {
        calculateTotalCarts: calculateTotalCarts,
        extractFustInfo: extractFustInfo,
        groupOrdersByCustomerAndRoute: groupOrdersByCustomerAndRoute,
        calculateCartsForGroup: calculateCartsForGroup,
        getRouteFromLocationId: getRouteFromLocationId,
        FUST_CAPACITIES: FUST_CAPACITIES,
        LOCATION_TO_ROUTE: LOCATION_TO_ROUTE
    };
}


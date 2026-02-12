/**
 * ORDER VALIDATION AND QUALITY CHECKS
 * Filters out invalid, test, cancelled, or duplicate orders
 */

/**
 * Get route from order
 */
function getRoute(order) {
    const locId = order.delivery_location_id || order.order?.delivery_location_id;
    if (locId === 32) return 'Aalsmeer';
    if (locId === 34) return 'Naaldwijk';
    if (locId === 36) return 'Rijnsburg';
    return 'Aalsmeer';
}

/**
 * Filter out deleted orders, contract orders, and invalid rows
 * This is called BEFORE validateOrders to remove bad data from API
 */
function filterValidOrderRows(rows) {
    const before = rows.length;
    const ZUIDPLAS_LOCATIONS = [32, 34, 36]; // Aalsmeer, Naaldwijk, Rijnsburg
    
    const stats = {
        removed_deleted: 0,
        removed_contract: 0,
        removed_no_company: 0,
        removed_no_assembly: 0,
        removed_wrong_location: 0
    };
    
    const valid = rows.filter(row => {
        const order = row.order || {};
        
        // EXCLUDE deleted orders
        if (order.deleted_at) {
            stats.removed_deleted++;
            return false;
        }
        
        // EXCLUDE contract/standing orders
        const types = order.types || [];
        if (types.includes('CONTRACT') || order.type === 32768) {
            stats.removed_contract++;
            return false;
        }
        
        // EXCLUDE rows with no company_id AND no real order data
        if (!row.company_id && !order.contact_name && !order.customer_id) {
            stats.removed_no_company++;
            return false;
        }
        
        // EXCLUDE if assembly_amount is 0
        if (!row.assembly_amount || row.assembly_amount === 0) {
            stats.removed_no_assembly++;
            return false;
        }
        
        // MUST have valid delivery_location_id (32, 34, or 36)
        const locationId = order.delivery_location_id || row.delivery_location_id;
        if (!ZUIDPLAS_LOCATIONS.includes(locationId)) {
            stats.removed_wrong_location++;
            return false;
        }
        
        return true;
    });
    
    console.log(`🔍 filterValidOrderRows: ${before} rows → ${valid.length} valid rows`);
    console.log(`   - Removed deleted: ${stats.removed_deleted}`);
    console.log(`   - Removed contract: ${stats.removed_contract}`);
    console.log(`   - Removed no company: ${stats.removed_no_company}`);
    console.log(`   - Removed no assembly: ${stats.removed_no_assembly}`);
    console.log(`   - Removed wrong location: ${stats.removed_wrong_location}`);
    
    return valid;
}

/**
 * Get only De Zuidplas order rows (valid locations only)
 */
function getZuidplasOrderRows(allRows) {
    // Step 1: Remove deleted and contract orders
    const validRows = filterValidOrderRows(allRows);
    
    // Step 2: Count unique real orders
    const uniqueIds = new Set(
        validRows.map(r => r.order_id || r.order?.id || r.order?.order_id || r.id).filter(Boolean)
    );
    
    console.log(`✅ De Zuidplas valid rows: ${validRows.length}`);
    console.log(`✅ De Zuidplas unique orders: ${uniqueIds.size}`);
    
    return validRows;
}

/**
 * Validate and filter orders
 */
function validateOrders(orders) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 VALIDATING', orders.length, 'orders...');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const validation = {
        total: orders.length,
        valid: 0,
        invalid: 0,
        reasons: {
            noAssembly: 0,
            noBundles: 0,
            noLocation: 0,
            noCustomer: 0,
            cancelled: 0,
            zeroQuantity: 0,
            testData: 0,
            duplicates: 0
        }
    };

    // Filter valid orders
    const validOrders = orders.filter(order => {
        
        // Check 1: Must have assembly_amount
        if (!order.assembly_amount || order.assembly_amount <= 0) {
            validation.reasons.noAssembly++;
            validation.invalid++;
            return false;
        }
        
        // Check 2: Must have bundles_per_fust or be calculable
        const bundlesPerFust = order.bundles_per_fust || 
                              (order.properties?.find(p => p.code === 'L11') && 
                               order.properties?.find(p => p.code === 'L13')) ||
                              order.nr_base_product;
        if (!bundlesPerFust || (typeof bundlesPerFust === 'number' && bundlesPerFust <= 0)) {
            validation.reasons.noBundles++;
            validation.invalid++;
            return false;
        }
        
        // Check 3: Must have delivery location
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        if (!locationId) {
            validation.reasons.noLocation++;
            validation.invalid++;
            return false;
        }
        
        // Check 4: Must have customer
        const customerId = order.customer_id || order.order?.customer_id;
        if (!customerId) {
            validation.reasons.noCustomer++;
            validation.invalid++;
            return false;
        }
        
        // Check 5: Filter out cancelled orders (English + Dutch states)
        const state = (order.state || order.status || '').toLowerCase();
        const cancelledStates = [
            'cancelled', 'deleted', 'void', 'geannuleerd', 
            'annuleer', 'afgezegd', 'afgewezen', 'rejected',
            'refunded', 'terugbetaald', 'inactive', 'inactief'
        ];
        if (cancelledStates.some(cancelledState => state.includes(cancelledState))) {
            validation.reasons.cancelled++;
            validation.invalid++;
            return false;
        }
        
        // Also check order.order.state if it exists
        const orderState = (order.order?.state || order.order?.status || '').toLowerCase();
        if (cancelledStates.some(cancelledState => orderState.includes(cancelledState))) {
            validation.reasons.cancelled++;
            validation.invalid++;
            return false;
        }
        
        // Check 6: Check for test data patterns
        const customerName = (order.customer_name || '').toLowerCase();
        if (customerName.includes('test') || 
            customerName.includes('demo') ||
            customerName === 'unknown' ||
            customerName.startsWith('customer ') && customerName.match(/customer \d+$/)) {
            // Only filter if it's clearly test data
            if (customerName.includes('test') || customerName.includes('demo')) {
                validation.reasons.testData++;
                validation.invalid++;
                return false;
            }
        }
        
        validation.valid++;
        return true;
    });

    // Check for duplicates
    const uniqueOrders = removeDuplicates(validOrders);
    validation.reasons.duplicates = validOrders.length - uniqueOrders.length;
    
    console.log('');
    console.log('✅ VALIDATION COMPLETE:');
    console.log('  Total orders:', validation.total);
    console.log('  Valid orders:', validation.valid);
    console.log('  Invalid orders:', validation.invalid);
    console.log('  After removing duplicates:', uniqueOrders.length);
    console.log('');
    console.log('  📊 BREAKDOWN:');
    console.log('    - No assembly:', validation.reasons.noAssembly);
    console.log('    - No bundles_per_fust:', validation.reasons.noBundles);
    console.log('    - No location:', validation.reasons.noLocation);
    console.log('    - No customer:', validation.reasons.noCustomer);
    console.log('    - Cancelled:', validation.reasons.cancelled);
    console.log('    - Test data:', validation.reasons.testData);
    console.log('    - Duplicates:', validation.reasons.duplicates);
    console.log('═══════════════════════════════════════════════════════════════════');

    return {
        orders: uniqueOrders,
        validation: validation
    };
}

/**
 * Remove duplicate orders
 */
function removeDuplicates(orders) {
    const seen = new Set();
    const unique = [];
    let duplicateCount = 0;
    
    orders.forEach(order => {
        // Create unique key from order details
        const orderId = order.id || order.orderrow_id;
        const customerId = order.customer_id || order.order?.customer_id;
        const locationId = order.delivery_location_id || order.order?.delivery_location_id;
        const assemblyAmount = order.assembly_amount;
        
        const key = `${orderId}_${customerId}_${locationId}_${assemblyAmount}`;
        
        if (seen.has(key)) {
            duplicateCount++;
            if (duplicateCount <= 5) {
                console.log('  ⚠️ Duplicate found:', orderId);
            }
            return false;
        }
        
        seen.add(key);
        unique.push(order);
    });
    
    if (duplicateCount > 5) {
        console.log(`  ⚠️ ... and ${duplicateCount - 5} more duplicates`);
    }
    
    return unique;
}

/**
 * Get order statistics for display
 */
function getOrderStats(orders) {
    const stats = {
        totalOrders: orders.length,
        byRoute: {
            Aalsmeer: 0,
            Naaldwijk: 0,
            Rijnsburg: 0
        },
        byCustomer: {},
        topCustomers: []
    };

    orders.forEach(order => {
        const route = getRoute(order);
        if (stats.byRoute.hasOwnProperty(route)) {
            stats.byRoute[route]++;
        }
        
        const customerId = order.customer_id || order.order?.customer_id;
        const customerName = order.customer_name || `Customer ${customerId}`;
        
        if (!stats.byCustomer[customerId]) {
            stats.byCustomer[customerId] = {
                name: customerName,
                count: 0
            };
        }
        stats.byCustomer[customerId].count++;
    });

    // Get top 10 customers
    stats.topCustomers = Object.entries(stats.byCustomer)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return stats;
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.OrderValidator = {
        validateOrders: validateOrders,
        getOrderStats: getOrderStats,
        removeDuplicates: removeDuplicates,
        filterValidOrderRows: filterValidOrderRows,
        getZuidplasOrderRows: getZuidplasOrderRows
    };
}


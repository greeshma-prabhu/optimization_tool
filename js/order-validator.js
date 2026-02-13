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
        removed_wrong_location: 0,
        removed_wrong_state: 0
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
        
        // EXCLUDE orders that are not 'Gereed' (Ready) state
        // Only process ready/processed orders, not 'Nieuw' (New/Contract)
        const state = (row.state || order.state || '').toString().trim();
        if (state && state.toLowerCase() !== 'gereed' && state.toLowerCase() !== 'ready') {
            stats.removed_wrong_state++;
            return false;
        }
        
        // CRITICAL: Check for cancellation in multiple places
        // Some orders are marked as 'Gereed' but are actually cancelled
        const orderStatus = (order.status || order.state || '').toString().toLowerCase();
        const rowStatus = (row.status || row.state || '').toString().toLowerCase();
        const cancelledKeywords = [
            'cancelled', 'geannuleerd', 'annuleer', 'afgezegd', 
            'afgewezen', 'rejected', 'void', 'deleted', 'inactive'
        ];
        
        // Check if status contains cancellation keywords
        if (cancelledKeywords.some(keyword => 
            orderStatus.includes(keyword) || rowStatus.includes(keyword)
        )) {
            stats.removed_deleted++; // Count as deleted
            return false;
        }
        
        // Check if order has cancellation flag
        if (order.cancelled === true || row.cancelled === true || 
            order.is_cancelled === true || row.is_cancelled === true) {
            stats.removed_deleted++;
            return false;
        }
        
        // DEBUG: Log Akkus orders for investigation
        const customerName = (order.contact_name || row.customer_name || '').toLowerCase();
        if (customerName.includes('akkus')) {
            console.log(`🔍 DEBUG Akkus order:`, {
                order_id: row.order_id || order.id,
                state: row.state || order.state,
                status: row.status || order.status,
                deleted_at: order.deleted_at,
                cancelled: order.cancelled || row.cancelled,
                types: order.types,
                type: order.type,
                assembly_amount: row.assembly_amount
            });
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
        const locationId = order.delivery_location_id || row.delivery_location_id || row.order?.delivery_location_id;
        if (!locationId || !ZUIDPLAS_LOCATIONS.includes(Number(locationId))) {
            stats.removed_wrong_location++;
            return false;
        }
        
        return true;
    });
    
    console.log(`🔍 filterValidOrderRows: ${before} rows → ${valid.length} valid rows`);
    console.log(`   - Removed deleted: ${stats.removed_deleted}`);
    console.log(`   - Removed contract: ${stats.removed_contract}`);
    console.log(`   - Removed wrong state (not Gereed): ${stats.removed_wrong_state}`);
    console.log(`   - Removed no company: ${stats.removed_no_company}`);
    console.log(`   - Removed no assembly: ${stats.removed_no_assembly}`);
    console.log(`   - Removed wrong location: ${stats.removed_wrong_location}`);
    
    return valid;
}

/**
 * Get only De Zuidplas order rows (valid locations only)
 * CRITICAL: Must filter by company to exclude "Royal Flowers" orders
 * Excel shows separate columns: "De Zuidplas" vs "Royal Flowers"
 * Dashboard should ONLY show "De Zuidplas" orders
 */
function getZuidplasOrderRows(allRows) {
    // Step 1: Remove deleted and contract orders
    let validRows = filterValidOrderRows(allRows);
    
    // Step 2: Filter by company_id to ONLY include "De Zuidplas" orders
    // TODO: Verify which company_id = "De Zuidplas" (might be 1, 2, 3, or 4)
    // For now, exclude NULL company_id (old contract orders) and filter by known De Zuidplas company_id
    // Based on Excel: "De Zuidplas" section should match, "Royal Flowers" should be excluded
    
    // CRITICAL: Only include orders with valid company_id (exclude NULL = old contract orders)
    // If company_id filtering is needed, uncomment and set the correct value:
    // const DE_ZUIDPLAS_COMPANY_ID = 1; // TODO: Verify this is correct!
    // const zuidplasOnlyRows = validRows.filter(row => {
    //     const companyId = row.company_id || row.order?.company_id;
    //     return companyId === DE_ZUIDPLAS_COMPANY_ID;
    // });
    
    // CRITICAL: Filter by company_id to ONLY include "De Zuidplas" orders
    // Excel shows separate columns: "De Zuidplas" (0 for Akkus) vs "Royal Flowers" (16 for Akkus)
    // Dashboard must match "De Zuidplas" column only!
    
    // Log company_id distribution first
    const companyIds = {};
    validRows.forEach(row => {
        const cid = row.company_id || row.order?.company_id || 'NULL';
        companyIds[cid] = (companyIds[cid] || 0) + 1;
    });
    
    if (Object.keys(companyIds).length > 1) {
        console.log(`⚠️ Multiple company_ids found:`, companyIds);
        
        // CRITICAL FIX: Filter to ONLY "De Zuidplas" company_id
        // Excel shows separate columns: "De Zuidplas" vs "Royal Flowers"
        // We need to identify which company_id is "De Zuidplas"
        // Strategy: Exclude NULL (old contracts) and try to identify De Zuidplas by process of elimination
        
        // Get the most common company_id (likely De Zuidplas)
        // But also check if we can identify it by customer names or other indicators
        const companyIdCounts = Object.entries(companyIds).sort((a, b) => b[1] - a[1]);
        const mostCommonCompanyId = companyIdCounts[0][0];
        
        // For now, use company_id from config or try to identify it
        // Check if there's a config setting
        const DE_ZUIDPLAS_COMPANY_ID = window.DE_ZUIDPLAS_COMPANY_ID || 
                                      (mostCommonCompanyId !== 'NULL' ? Number(mostCommonCompanyId) : null);
        
        if (DE_ZUIDPLAS_COMPANY_ID !== null) {
            console.log(`🔍 Filtering to ONLY company_id ${DE_ZUIDPLAS_COMPANY_ID} (De Zuidplas)...`);
            console.log(`   Company ID distribution:`, companyIds);
            console.log(`   Using company_id ${DE_ZUIDPLAS_COMPANY_ID} (most common: ${mostCommonCompanyId})`);
            
            const beforeFilter = validRows.length;
            
            const zuidplasOnlyRows = validRows.filter(row => {
                const companyId = row.company_id || row.order?.company_id;
                return companyId === DE_ZUIDPLAS_COMPANY_ID;
            });
            
            const afterFilter = zuidplasOnlyRows.length;
            const removed = beforeFilter - afterFilter;
            
            console.log(`   Filtered: ${beforeFilter} rows → ${afterFilter} rows (removed ${removed} from other companies)`);
            console.log(`   ✅ Only "De Zuidplas" orders (company_id ${DE_ZUIDPLAS_COMPANY_ID}) included`);
            console.log(`   ⚠️ Excluded: ${removed} orders from other companies (Royal Flowers, etc.)`);
            
            validRows = zuidplasOnlyRows;
        } else {
            console.warn(`⚠️ Could not determine De Zuidplas company_id - including all valid rows`);
            console.warn(`⚠️ Set window.DE_ZUIDPLAS_COMPANY_ID = <number> to filter correctly`);
        }
    }
    
    // Step 3: Count unique real orders
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

/**
 * Filter orders by company_id to only include "De Zuidplas" orders
 * Can be called on cached orders to apply filtering retroactively
 */
function filterByCompanyId(orders) {
    if (!orders || orders.length === 0) return orders;
    
    const companyIds = {};
    orders.forEach(row => {
        const cid = row.company_id || row.order?.company_id || 'NULL';
        companyIds[cid] = (companyIds[cid] || 0) + 1;
    });
    
    if (Object.keys(companyIds).length <= 1) {
        // Only one company_id, no filtering needed
        return orders;
    }
    
    // Determine De Zuidplas company_id
    const DE_ZUIDPLAS_COMPANY_ID = window.DE_ZUIDPLAS_COMPANY_ID || 
        (() => {
            // Use most common company_id (excluding NULL)
            const sorted = Object.entries(companyIds)
                .filter(([id]) => id !== 'NULL')
                .sort((a, b) => b[1] - a[1]);
            return sorted.length > 0 ? Number(sorted[0][0]) : null;
        })();
    
    if (DE_ZUIDPLAS_COMPANY_ID === null) {
        console.warn(`⚠️ Could not determine De Zuidplas company_id - set window.DE_ZUIDPLAS_COMPANY_ID = <number>`);
        return orders; // Return all if can't determine
    }
    
    const before = orders.length;
    const filtered = orders.filter(row => {
        const companyId = row.company_id || row.order?.company_id;
        return companyId === DE_ZUIDPLAS_COMPANY_ID;
    });
    
    if (before !== filtered.length) {
        console.log(`🔍 filterByCompanyId: ${before} → ${filtered.length} (company_id ${DE_ZUIDPLAS_COMPANY_ID})`);
    }
    
    return filtered;
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.OrderValidator = {
        validateOrders: validateOrders,
        getOrderStats: getOrderStats,
        removeDuplicates: removeDuplicates,
        filterValidOrderRows: filterValidOrderRows,
        getZuidplasOrderRows: getZuidplasOrderRows,
        filterByCompanyId: filterByCompanyId
    };
}


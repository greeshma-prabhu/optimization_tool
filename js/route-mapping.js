/**
 * Client to Route Mapping
 * Source: Planningstabel 2.0 - Official planning sheet from Zuidplas
 * These client-hub assignments are PERMANENT and don't change
 */

const CLIENT_ROUTE_MAPPING = {
  // ========================================
  // RIJNSBURG ROUTE (09:00 departure)
  // 27 clients from Excel (OFFICIAL - from Planningstabel_2_0__2_.xlsx)
  // ========================================
  'rijnsburg': [
    'A. Heemskerk',
    'Aad van Duijn',
    'Albert Noort',
    'Bohemen',
    'C van Klaveren',
    'C.W de Mooij',
    'Floral Sourcing',
    'H. Star',
    'Hermes Bloemen',
    'Heyer',
    'Hoek groothandel',
    'Hollandirect',
    'Kariflex',
    'kooter',
    'L&M',
    'Maat & Zoon',
    'Nagel',
    'Nic den Heijer',
    'Jason Walters',
    'Retail Flower',
    'Sorisso Verde',
    'Star T.',
    'Star v/d Gugten',
    'V/D PLAS',
    'V&E Export',
    'Vianen',
    'St. Gabriel'
  ],
  
  // ========================================
  // AALSMEER ROUTE (10:00 departure)  
  // 44 clients from Excel (OFFICIAL - from Planningstabel_2_0__2_.xlsx)
  // ========================================
  'aalsmeer': [
    'Akkus',
    'Albert Heijn',
    'Behne Blumen',
    'By Special',
    'Bloomon',
    'Directflor',
    'Divflo',
    'Fleura Metz',
    'Flora Service',
    'EZ Flower',
    'Floral Connection',
    'Floris Holland',
    'Floral Charm',
    'Hans Visser',
    'Hans Visser P',
    'Hans Visser B',
    'Greenflor',
    'hilverda de boer',
    'holex',
    'Hoekhuis Aalsmeer',
    'Intratuin',
    'IBH',
    'Lem',
    'F.T.C. Aalsmeer',
    'KUB Flowers',
    'Hoorn',
    'OZ Zurel',
    'Nijssen',
    'PS Flowers',
    'Roelofs',
    'salaba/barile',
    'Slikweid',
    'Spaargaren',
    'Transfleur',
    'Thom Slootman',
    'Tuning',
    'verbeek en bol',
    'Vliet',
    'Vimex',
    'Verdnatura',
    'waterdrinker',
    'Willemsen',
    'Zandbergen',
    'MM Flower'
  ],
  
  // ========================================
  // NAALDWIJK ROUTE (11:00 departure)
  // 34 clients from Excel (OFFICIAL - from Planningstabel_2_0__2_.xlsx)
  // ========================================
  'naaldwijk': [
    'Astrafund',
    'Bloomer Flowers',
    'Bachetle',
    'Bloom Bouqet',
    'Capitol fl.',
    'D vd Vijver',
    'Diva Flowers',
    'E- Flowers',
    'Euroveiling',
    'Flowering Direct',
    'Florca Westland',
    'Flowers All-inn',
    'Flowerportal',
    'FSF',
    'Flamingo Flowers',
    'Goldman',
    'H. Star',
    'MD Agro Import',
    'Kontikiflor',
    'Kuipers',
    'Leeuwenburg',
    'Lion Fleurex',
    'Premium',
    'Sjaak vd vijver',
    'SQ Flora',
    'v Vliet',
    'Webshopflower',
    'West Flora Export',
    'What If',
    'Zeester',
    'Zuylen',
    'Denen',
    'Bosjes',
    'Crocus'
  ]
};

// TOTAL: 105 clients across 3 routes (27 + 44 + 34)

// Danish cart clients (these use special larger carts)
const DANISH_CART_CLIENTS = [
  'Superflora',
  'Flamingo',
  'Flamingo Flowers',
  'Flower Trade Consult',
  'MM Flowers',
  'Dijk Flora'
];

// Departure times per route
const ROUTE_DEPARTURE_TIMES = {
  'rijnsburg': '09:00',
  'aalsmeer': '10:00',
  'naaldwijk': '11:00',
  'late_delivery': 'End middag / avond'
};

// Special handling clients (late delivery)
const LATE_DELIVERY_CLIENTS = [
  'Rheinmaas',
  'Plantion',
  'Algemeen'
];

/**
 * CANONICAL name normalization function
 * PRESERVES Dutch particles (van, der, de, den, vd, v/d) - these are identity words!
 * Used by ALL matching functions for consistency
 */
function normalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Normalize spaces
    .replace(/[&]/g, ' ')           // Replace ampersands with space
    .replace(/\./g, '')              // Remove periods
    .replace(/b\.v\.|bv|b v|b\.v/gi, '')      // Remove BV suffix
    .replace(/v\.o\.f\.|vof/gi, '')           // Remove VOF suffix
    .replace(/\s+(export|flowers?|bloemen|plant|swiss|holland|westland|aalsmeer|naaldwijk|rijnsburg|bleiswijk|klondike|gerbera|mini|webshop|retail|holding|group)/gi, ' ')  // Remove common business suffixes
    .replace(/\(.*?\)/g, '')        // Remove content in parentheses
    .replace(/-/g, ' ')              // Replace hyphens with spaces
    .replace(/\//g, ' ')             // Replace slashes with spaces (V/D → V D)
    .replace(/van der|vander/gi, 'van der')  // Normalize "van der" (PRESERVE it!)
    .replace(/v d|vd/gi, 'van der')  // Normalize "v d" and "vd" to "van der"
    // CRITICAL: DO NOT remove Dutch particles (van, der, de, den, vd, v/d)
    // These are identity words, not noise!
    .trim();
}

/**
 * Tokenize a normalized name into tokens
 * Filters out empty tokens and very short tokens (length < 2)
 */
function tokenizeName(normalizedName) {
  if (!normalizedName) return [];
  
  return normalizedName
    .split(/\s+/)
    .filter(token => token.length >= 2)  // Keep tokens with length >= 2
    .filter((token, index, arr) => arr.indexOf(token) === index); // Remove duplicates
}

/**
 * Calculate token overlap percentage between two token arrays
 * Returns: overlap percentage (0-100)
 */
function calculateTokenOverlap(tokens1, tokens2) {
  if (tokens1.length === 0 && tokens2.length === 0) return 100;
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  // Count overlapping tokens
  let overlapCount = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      overlapCount++;
    }
  }
  
  // Calculate percentage based on the smaller set (more conservative)
  const minLength = Math.min(set1.size, set2.size);
  return minLength > 0 ? (overlapCount / minLength) * 100 : 0;
}

/**
 * Find closest Excel candidate for an unmatched customer
 * Returns: { client: string, route: string, overlap: number } | null
 */
function findClosestCandidate(customerName, normalizedCustomer, customerTokens) {
  let bestMatch = null;
  let bestOverlap = 0;
  
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      const normalizedClient = normalizeName(client);
      const clientTokens = tokenizeName(normalizedClient);
      const overlap = calculateTokenOverlap(customerTokens, clientTokens);
      
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = { client, route, overlap };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get route for a customer using TOKEN-BASED MATCHING
 * API customer names might be slightly different from planning sheet
 * 
 * Matching logic:
 * 1. Normalize both names (preserves Dutch particles)
 * 2. Tokenize into words
 * 3. Match if ≥60% of tokens overlap (order independent)
 * 4. Ignores punctuation only
 */
function getRouteForCustomer(customerName) {
  if (!customerName) return null; // NO DEFAULT - unmatched must remain unmatched
  
  const normalizedCustomer = normalizeName(customerName);
  const customerTokens = tokenizeName(normalizedCustomer);
  
  if (customerTokens.length === 0) return null;
  
  // Check late delivery clients first
  const LATE_DELIVERY = ['rheinmaas', 'plantion', 'algemeen'];
  for (const late of LATE_DELIVERY) {
    if (normalizedCustomer.includes(late)) {
      return 'late_delivery';
    }
  }
  
  // Search through all routes
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      const normalizedClient = normalizeName(client);
      const clientTokens = tokenizeName(normalizedClient);
      
      // Calculate token overlap
      const overlap = calculateTokenOverlap(customerTokens, clientTokens);
      
      // Match if ≥60% of tokens overlap
      if (overlap >= 60) {
        return route;
      }
    }
  }
  
  // No match found - log for debugging
  const closest = findClosestCandidate(customerName, normalizedCustomer, customerTokens);
  if (typeof window !== 'undefined' && window.DEBUG_CLIENT_MATCHING) {
    console.log(`⚠️ Unmatched customer: "${customerName}"`);
    console.log(`   Normalized: "${normalizedCustomer}"`);
    console.log(`   Tokens: [${customerTokens.join(', ')}]`);
    if (closest) {
      console.log(`   Closest Excel candidate: "${closest.client}" (${closest.overlap.toFixed(1)}% overlap, route: ${closest.route})`);
    }
  }
  
  // Track unmapped customers globally
  if (typeof window !== 'undefined') {
    if (!window.unmappedCustomers) {
      window.unmappedCustomers = new Set();
    }
    window.unmappedCustomers.add(customerName);
  }
  
  return null; // NO DEFAULT - unmatched must remain unmatched
}

/**
 * Check if customer is in our known client list (Excel-mapped clients only)
 * Returns: { matched: boolean, route: string|null }
 * CRITICAL: Only returns true for clients in CLIENT_ROUTE_MAPPING
 * Uses SAME token-based matching as getRouteForCustomer
 */
function isKnownClient(customerName) {
  if (!customerName) {
    return { matched: false, route: null };
  }
  
  // Use getRouteForCustomer for consistency (same matching logic)
  const route = getRouteForCustomer(customerName);
  
  if (route) {
    return { matched: true, route: route };
  }
  
  // No match found - log for debugging (optional)
  if (typeof window !== 'undefined' && window.DEBUG_CLIENT_MATCHING) {
    const normalizedCustomer = normalizeName(customerName);
    const customerTokens = tokenizeName(normalizedCustomer);
    const closest = findClosestCandidate(customerName, normalizedCustomer, customerTokens);
    
    console.log(`⚠️ Unmatched customer: "${customerName}"`);
    console.log(`   Normalized: "${normalizedCustomer}"`);
    console.log(`   Tokens: [${customerTokens.join(', ')}]`);
    if (closest) {
      console.log(`   Closest Excel candidate: "${closest.client}" (${closest.overlap.toFixed(1)}% overlap, route: ${closest.route})`);
    }
  }
  
  // Not found in any route - NOT a known client
  return { matched: false, route: null };
}

/**
 * Separate orders into matched (Excel clients) and unmatched (DUMP BASKET)
 * CRITICAL BUSINESS RULE: Only process orders from Excel-mapped clients
 */
function separateOrdersByClientMatch(orders) {
  const matched = [];
  const unmatched = [];
  
  orders.forEach(order => {
    const customerName = order.customer_name || order.order?.customer_name || '';
    const result = isKnownClient(customerName);
    
    if (result.matched) {
      order.route = result.route;
      order.isKnownClient = true;
      matched.push(order);
    } else {
      order.route = 'unmatched';
      order.isKnownClient = false;
      unmatched.push(order);
    }
  });
  
  // Count by route for logging
  const matchedByRoute = {
    rijnsburg: matched.filter(o => o.route === 'rijnsburg').length,
    aalsmeer: matched.filter(o => o.route === 'aalsmeer').length,
    naaldwijk: matched.filter(o => o.route === 'naaldwijk').length
  };
  
  // Get unique unmatched customers for optional logging
  const unmatchedCustomers = [...new Set(unmatched.map(o => o.customer_name || o.order?.customer_name || '').filter(Boolean))];
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔍 CLIENT MATCHING RESULTS (EXCEL CLIENTS ONLY):');
  console.log(`✅ Matched (in Excel): ${matched.length} orders`);
  console.log(`   - Rijnsburg: ${matchedByRoute.rijnsburg} orders`);
  console.log(`   - Aalsmeer: ${matchedByRoute.aalsmeer} orders`);
  console.log(`   - Naaldwijk: ${matchedByRoute.naaldwijk} orders`);
  console.log(`⚠️ Unmatched (DUMP BASKET): ${unmatched.length} orders`);
  console.log(`📊 Total clients in Excel: ${CLIENT_ROUTE_MAPPING.rijnsburg.length + CLIENT_ROUTE_MAPPING.aalsmeer.length + CLIENT_ROUTE_MAPPING.naaldwijk.length}`);
  
  // Optional logging for unmatched customers (for debugging)
  if (typeof window !== 'undefined' && window.DEBUG_CLIENT_MATCHING && unmatchedCustomers.length > 0) {
    console.log(`\n⚠️ Unmatched customers (${unmatchedCustomers.length}):`);
    unmatchedCustomers.sort().forEach((name, i) => {
      console.log(`   ${i + 1}. "${name}"`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════════════');
  
  return { matched, unmatched };
}

/**
 * Show summary of unmapped customers
 */
function showUnmappedCustomersSummary() {
  if (typeof window !== 'undefined' && window.unmappedCustomers && window.unmappedCustomers.size > 0) {
    console.warn('\n⚠️⚠️⚠️ UNMAPPED CUSTOMERS SUMMARY ⚠️⚠️⚠️');
    console.warn(`Found ${window.unmappedCustomers.size} customers not in route mapping:`);
    Array.from(window.unmappedCustomers).sort().forEach((name, i) => {
      console.warn(`  ${i+1}. "${name}"`);
    });
    console.warn('Please add these to js/route-mapping.js in the correct route\n');
  }
}

/**
 * Check if customer uses Danish carts
 */
function usesDanishCarts(customerName) {
  if (!customerName) return false;
  
  const nameLower = customerName.toLowerCase();
  return DANISH_CART_CLIENTS.some(dc => {
    const dcLower = dc.toLowerCase();
    return nameLower.includes(dcLower) || dcLower.includes(nameLower);
  });
}

/**
 * Get departure time for a route
 */
function getDepartureTime(route) {
  return ROUTE_DEPARTURE_TIMES[route] || '09:00';
}

/**
 * Get cart capacity based on cart type
 * Danish carts have different capacities than standard carts
 * Source: Jeroen's specifications and planning sheet notes
 */
function getCartCapacity(fustType, isDanish) {
  if (isDanish) {
    // Danish cart capacities (from planning sheet and Jeroen's info)
    const danishCapacities = {
      '902': 24,  // Max 24 for Danish 902 (denen 902 24 max)
      '996': 32,  // Max 32 for Danish 996 (denen 996 32 max)
      '612': 68,  // 68-72 for Danish 612 (612 68/72 per kar)
      '614': 68   // Same as 612
    };
    return danishCapacities[fustType] || 24; // Default Danish capacity
  } else {
    // Standard cart capacities (from analysis document)
    const standardCapacities = {
      '612': 72,  // 3 layers × 24
      '614': 72,  // Same as 612
      '575': 32,  // 575/996 32 per kar
      '902': 40,  // 902 40 per kar
      '588': 40,  // Medium container
      '996': 32,  // 575/996 32 per kar
      '856': 20,  // Charge code €6.00
      '821': 40   // Similar to 902
    };
    return standardCapacities[fustType] || 72; // Default standard capacity
  }
}

// Export to window for use in other files
if (typeof window !== 'undefined') {
  window.RouteMapping = {
    getRouteForCustomer: getRouteForCustomer,
    usesDanishCarts: usesDanishCarts,
    getDepartureTime: getDepartureTime,
    getCartCapacity: getCartCapacity,
    showUnmappedCustomersSummary: showUnmappedCustomersSummary,
    isKnownClient: isKnownClient,
    separateOrdersByClientMatch: separateOrdersByClientMatch,
    CLIENT_ROUTE_MAPPING: CLIENT_ROUTE_MAPPING,
    DANISH_CART_CLIENTS: DANISH_CART_CLIENTS,
    ROUTE_DEPARTURE_TIMES: ROUTE_DEPARTURE_TIMES,
    LATE_DELIVERY_CLIENTS: LATE_DELIVERY_CLIENTS
  };
  
  console.log('✅ Route mapping loaded successfully!');
  console.log('   Rijnsburg:', CLIENT_ROUTE_MAPPING.rijnsburg.length, 'clients');
  console.log('   Aalsmeer:', CLIENT_ROUTE_MAPPING.aalsmeer.length, 'clients');
  console.log('   Naaldwijk:', CLIENT_ROUTE_MAPPING.naaldwijk.length, 'clients');
  console.log('   TOTAL:', 
    CLIENT_ROUTE_MAPPING.rijnsburg.length + 
    CLIENT_ROUTE_MAPPING.aalsmeer.length + 
    CLIENT_ROUTE_MAPPING.naaldwijk.length, 
    'Excel-mapped clients (ONLY these are processed)');
  console.log('   Danish cart clients:', DANISH_CART_CLIENTS.length);
  console.log('   ⚠️ CRITICAL: Only Excel-mapped clients are processed!');
  console.log('   ⚠️ All other orders go to DUMP BASKET!');
}

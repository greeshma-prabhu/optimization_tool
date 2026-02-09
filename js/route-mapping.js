/**
 * Client to Route Mapping
 * Source: Planningstabel 2.0 - Official planning sheet from Zuidplas
 * These client-hub assignments are PERMANENT and don't change
 */

const CLIENT_ROUTE_MAPPING = {
  // ========================================
  // MORNING ROUTES (09:00 / 10:00 / 11:00)
  // ========================================
  'rijnsburg_morning': [
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
    'L&M Rijnsburg',  // ADD: API variation
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
    'St. Gabriel',
    'St.Gabriel'  // ADD: without space variation
  ],
  
  // ========================================
  'aalsmeer_morning': [
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
    'MM Flower',
    'Klok Aalsmeer'  // ADD: Klok variant
  ],
  
  // ========================================
  'naaldwijk_morning': [
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
    'Liga Flor',
    'Liga Flor B.V',
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
    'Crocus',
    'Superflora',  // ADD: Danish cart client
    'Superflora BV',  // ADD: API variation
    'Klok Naaldwijk'  // ADD: Klok variant
  ],

  // ========================================
  // EVENING ROUTES (17:00 / 18:00 / 19:00)
  // Provided by user (Avond. tabs)
  // ========================================
  'rijnsburg_evening': [
    'A. Heemskerk',
    'Albert Noort',
    'Esmeralda',
    'Floral Sourcing',
    'HGR',
    'Heyer inkoop',
    'L&M Zaterdag',
    'L&M',
    'Nagel',
    'Ransom',
    'Retail Flowers',
    'Vianen',
    'V/D Plas',
    'V&E Export',
    'karren Bosjes'
  ],
  'aalsmeer_evening': [
    'Akkus',
    'Albert Heijn',
    'Bloem Fleurtiek',
    'By Special Zaterdag',
    'By Special',
    'Dobbe',
    'Fleura Metz',
    'Floral Connection',
    'Flower Direct',
    'Greenflor',
    'FTC Aalsmeer',
    'Guchtenaere',
    'Hans Visser SK-SV',
    'Hans Visser B-SV',
    'Hans Visser B',
    'Hans Visser P-SV',
    'Hans Visser P',
    'Hoekhuis Aalsmeer',
    'Nijssen',
    'Hoorn',
    'Trans-Fleur',
    'Slootman',
    'Verbeek en Bol',
    'Waterdrinker',
    'Willemsen',
    'Zurel',
    'Bosjes',
    'Klok Dozen',
    'MM Flowers',
    'Dijkflora'
  ],
  'naaldwijk_evening': [
    'Bachetle',
    'Bloombouquet',
    'Blumen Aschof',
    'Capitol Flowers',
    'Flamingo',
    'H. Star',
    'H.P Nieuwkerk & Zn.',
    'Hoekhuis',
    'Kontikiflor',
    'Leeuwenburg',
    'Premium',
    'Penning',
    'Vliet',
    'Goedegeburen',
    'Zalam',
    'CON',
    'Superflora',
    'F.T.C. Bleiswijk',
    'Rhein-Maas',
    'Bosjes Overig',
    'Klok Dozen',
    'Klok Bosjes'
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
  'Dijk Flora',
  'Dijkflora'
];

// Departure times per route
const ROUTE_DEPARTURE_TIMES = {
  'rijnsburg': '09:00',
  'aalsmeer': '10:00',
  'naaldwijk': '11:00',
  'rijnsburg_morning': '09:00',
  'aalsmeer_morning': '10:00',
  'naaldwijk_morning': '11:00',
  'rijnsburg_evening': '17:00',
  'aalsmeer_evening': '18:00',
  'naaldwijk_evening': '19:00',
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
 * Simple normalization: lowercase, remove prefixes/suffixes, clean punctuation
 * 
 * Removes:
 * - Quantity prefixes (1x, 2x, 3x)
 * - Legal suffixes (BV, B.V., VOF, webshop, retail, export, holding, group)
 * - Special characters and punctuation
 * - Multiple spaces
 */
function normalizeName(name) {
  if (!name) return '';
  
  // Step 1: Basic cleanup
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');  // Normalize spaces
  
  // Step 2: Remove quantity prefixes (1x, 2x, 3x)
  normalized = normalized.replace(/^\d+x\s*/i, '');
  
  // Step 3: Remove content in parentheses/brackets (CRITICAL - do this early!)
  normalized = normalized
    .replace(/\([^)]*\)/g, ' ')  // Remove parentheses content (e.g., "(MINI)", "(GERBERA)")
    .replace(/\[[^\]]*\]/g, ' ')  // Remove bracket content
    .replace(/\{[^\}]*\}/g, ' ');  // Remove curly brace content
  
  // Step 4: Remove legal suffixes (at end of string)
  normalized = normalized
    .replace(/\s+b\.v\.|bv|b\s*v\s*$/gi, '')
    .replace(/\s+v\.o\.f\.|vof\s*$/gi, '')
    .replace(/\s+webshop\s*$/gi, ' ')
    .replace(/\s+retail\s*$/gi, ' ')
    .replace(/\s+export\s*$/gi, ' ')
    .replace(/\s+holding\s*$/gi, ' ')
    .replace(/\s+group\s*$/gi, ' ')
    .replace(/\s+s\.r\.o\.|sro\s*$/gi, '');
  
  // Step 5: Normalize punctuation BUT preserve & and - for matching
  normalized = normalized
    .replace(/\./g, '')  // Remove periods
    .replace(/&/g, ' en ')  // Replace & with " en " for matching (L&M → l en m)
    .replace(/-/g, ' ')  // Replace hyphens with space
    .replace(/\//g, ' ')  // Replace slashes with space
    .replace(/[^\w\s]/g, ' ');  // Remove other special chars
  
  // Step 6: Final cleanup
  normalized = normalized
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Get words from normalized name (split by spaces, filter empty)
 */
function getWords(normalizedName) {
  if (!normalizedName) return [];
  return normalizedName.split(/\s+/).filter(w => w.length > 0);
}

function getPeriodHintFromName(nameLower) {
  if (!nameLower) return null;
  if (nameLower.includes('avond') || nameLower.includes('zaterdag')) {
    return 'evening';
  }
  return null;
}

function makeRouteResult(route, period) {
  const safePeriod = period || 'morning';
  const routeKey = `${route}_${safePeriod}`;
  return {
    matched: true,
    route,
    period: safePeriod,
    routeKey
  };
}

/**
 * Check if customer is in our known client list (Excel-mapped clients only)
 * Returns: { matched: boolean, route: string|null, period: 'morning'|'evening'|null, routeKey: string|null }
 */
function isKnownClient(customerName) {
  if (!customerName) {
    return { matched: false, route: null, period: null, routeKey: null };
  }
  
  // SPECIAL CASES - Direct string matches for known problematic clients
  // Check these BEFORE normalization to catch variations
  const nameLower = customerName.toLowerCase();
  
  // Superflora - Danish cart client in Naaldwijk
  if (nameLower.includes('superflora')) {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('naaldwijk', periodHint);
  }

  // Goldman - Naaldwijk (avoid L&M false positives like "Goldman LM Sro")
  if (nameLower.includes('goldman')) {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('naaldwijk', periodHint);
  }

  // H. Star - resolve Naaldwijk explicitly when location is present
  if ((nameLower.includes('h. star') || nameLower.includes('h star')) && nameLower.includes('naaldwijk')) {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('naaldwijk', periodHint);
  }
  
  // L&M variations - Rijnsburg
  if (nameLower.includes('l&m') || nameLower.includes('lm ') || nameLower.includes('l en m')) {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('rijnsburg', periodHint);
  }
  
  // St.Gabriel variations - Rijnsburg
  if (nameLower.includes('st.gabriel') || nameLower.includes('st gabriel') || nameLower.includes('stgabriel')) {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('rijnsburg', periodHint);
  }
  
  // Klok variations - check location
  if (nameLower.includes('klok')) {
    const periodHint = getPeriodHintFromName(nameLower);
    if (nameLower.includes('aalsmeer')) {
      return makeRouteResult('aalsmeer', periodHint);
    }
    if (nameLower.includes('naaldwijk')) {
      return makeRouteResult('naaldwijk', periodHint);
    }
    if (nameLower.includes('rijnsburg')) {
      return makeRouteResult('rijnsburg', periodHint);
    }
    return makeRouteResult('aalsmeer', periodHint);
  }
  
  // E- Flowers / eFlowers variations - Naaldwijk
  // Excel: "E- Flowers" → API: "eFlowers B.V." or "eFlowers"
  if (nameLower.includes('eflowers') || nameLower.includes('e flowers') || nameLower === 'e- flowers') {
    const periodHint = getPeriodHintFromName(nameLower);
    return makeRouteResult('naaldwijk', periodHint);
  }
  
  // Step 1: Normalize API customer name
  const normalizedCustomer = normalizeName(customerName);
  
  if (!normalizedCustomer) {
    return { matched: false, route: null };
  }
  
  // Step 2: Split API name into word array
  const apiWords = getWords(normalizedCustomer);
  
  // Check late delivery clients first (word-by-word, not substring)
  const LATE_DELIVERY = ['rheinmaas', 'plantion', 'algemeen'];
  for (const late of LATE_DELIVERY) {
    // Check if any API word equals or starts with late delivery keyword
    for (const apiWord of apiWords) {
      if (apiWord === late || apiWord.startsWith(late)) {
        return { matched: true, route: 'late_delivery', period: null, routeKey: 'late_delivery' };
      }
    }
  }
  
  // Search through all routes
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      // Step 1: Normalize Excel client name
      const normalizedClient = normalizeName(client);
      
      // Rule 1: Exact match after normalization
      if (normalizedCustomer === normalizedClient) {
        const period = route.includes('_evening') ? 'evening' : 'morning';
        const baseRoute = route.replace('_morning', '').replace('_evening', '');
        return { matched: true, route: baseRoute, period: period, routeKey: route };
      }
      
      // Step 2: Split Excel client name into word array
      const excelWords = getWords(normalizedClient);
      
      // Step 3: Filter out short words (length <= 2) from BOTH
      const meaningfulExcelWords = excelWords.filter(word => word.length > 2);
      const meaningfulApiWords = apiWords.filter(word => word.length > 2);
      
      // Skip if Excel client has no meaningful words
      if (meaningfulExcelWords.length === 0) {
        continue;
      }
      
      // CRITICAL FIX: Check if ALL Excel words are found in API words
      // API can have EXTRA words (like "MINI", "GERBERA", "BV")
      // But ALL Excel words MUST be present in API
      const allExcelWordsFoundInApi = meaningfulExcelWords.every(excelWord => {
        // Check if this Excel word appears in ANY API word
        for (const apiWord of meaningfulApiWords) {
          // Match if:
          // 1. Exact match: apiWord === excelWord
          // 2. API word contains Excel word: apiWord starts with excelWord
          // 3. Excel word contains API word: excelWord starts with apiWord (for abbreviations)
          if (apiWord === excelWord || 
              apiWord.startsWith(excelWord) || 
              excelWord.startsWith(apiWord)) {
            return true;
          }
        }
        return false;
      });
      
      if (allExcelWordsFoundInApi) {
        // ADDITIONAL CHECK: Ensure at least 2 meaningful words match (to avoid false positives)
        // OR if Excel only has 1 meaningful word, that's OK
        if (meaningfulExcelWords.length === 1 || 
            meaningfulExcelWords.filter(excelWord => 
              meaningfulApiWords.some(apiWord => 
                apiWord === excelWord || 
                apiWord.startsWith(excelWord) || 
                excelWord.startsWith(apiWord)
              )
            ).length >= 2) {
          const period = route.includes('_evening') ? 'evening' : 'morning';
          const baseRoute = route.replace('_morning', '').replace('_evening', '');
          return { matched: true, route: baseRoute, period: period, routeKey: route };
        }
      }
    }
  }
  
  // No match found - log for debugging (optional)
  if (typeof window !== 'undefined' && window.DEBUG_CLIENT_MATCHING) {
    console.log(`⚠️ Unmatched customer: "${customerName}"`);
    console.log(`   Normalized: "${normalizedCustomer}"`);
    console.log(`   API words: [${apiWords.join(', ')}]`);
  }
  
  // Not found in any route - NOT a known client
  return { matched: false, route: null, period: null, routeKey: null };
}

/**
 * Get route for a customer
 * CRITICAL: Must ONLY be called AFTER client is confirmed known via isKnownClient()
 * Returns route string or null if unmatched
 */
function getRouteForCustomer(customerName) {
  if (!customerName) return null;
  
  // Use isKnownClient() as the ONLY matching function
  const result = isKnownClient(customerName);
  
  if (result.matched) {
    return result.route;
  }
  
  return null; // NO DEFAULT - unmatched must remain unmatched
}

function inferPeriodFromOrder(order) {
  const timeCandidates = [
    order.delivery_time,
    order.order?.delivery_time,
    order.delivery_date,
    order.order?.delivery_date,
    order.deliveryDate
  ].filter(Boolean);

  for (const candidate of timeCandidates) {
    const match = String(candidate).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (!Number.isNaN(hour)) {
        return hour >= 15 ? 'evening' : 'morning';
      }
    }
  }

  return 'morning';
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
      order.period = result.period || 'morning';
      order.routeKey = result.routeKey || `${result.route}_${order.period}`;
      order.isKnownClient = true;
      matched.push(order);
    } else {
      order.route = 'unmatched';
      order.period = inferPeriodFromOrder(order);
      order.routeKey = null;
      order.isKnownClient = false;
      unmatched.push(order);
    }
  });
  
  // Count by route for logging
  const matchedByRoute = {
    rijnsburg_morning: matched.filter(o => o.routeKey === 'rijnsburg_morning').length,
    aalsmeer_morning: matched.filter(o => o.routeKey === 'aalsmeer_morning').length,
    naaldwijk_morning: matched.filter(o => o.routeKey === 'naaldwijk_morning').length,
    rijnsburg_evening: matched.filter(o => o.routeKey === 'rijnsburg_evening').length,
    aalsmeer_evening: matched.filter(o => o.routeKey === 'aalsmeer_evening').length,
    naaldwijk_evening: matched.filter(o => o.routeKey === 'naaldwijk_evening').length
  };
  
  // Get unique unmatched customers for optional logging
  const unmatchedCustomers = [...new Set(unmatched.map(o => o.customer_name || o.order?.customer_name || '').filter(Boolean))];
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔍 CLIENT MATCHING RESULTS (EXCEL CLIENTS ONLY):');
  console.log(`✅ Matched (in Excel): ${matched.length} orders`);
  console.log(`   - Rijnsburg (morning): ${matchedByRoute.rijnsburg_morning} orders`);
  console.log(`   - Aalsmeer (morning): ${matchedByRoute.aalsmeer_morning} orders`);
  console.log(`   - Naaldwijk (morning): ${matchedByRoute.naaldwijk_morning} orders`);
  console.log(`   - Rijnsburg (evening): ${matchedByRoute.rijnsburg_evening} orders`);
  console.log(`   - Aalsmeer (evening): ${matchedByRoute.aalsmeer_evening} orders`);
  console.log(`   - Naaldwijk (evening): ${matchedByRoute.naaldwijk_evening} orders`);
  console.log(`⚠️ Unmatched (DUMP BASKET): ${unmatched.length} orders`);
  const totalClientCount =
    CLIENT_ROUTE_MAPPING.rijnsburg_morning.length +
    CLIENT_ROUTE_MAPPING.aalsmeer_morning.length +
    CLIENT_ROUTE_MAPPING.naaldwijk_morning.length +
    CLIENT_ROUTE_MAPPING.rijnsburg_evening.length +
    CLIENT_ROUTE_MAPPING.aalsmeer_evening.length +
    CLIENT_ROUTE_MAPPING.naaldwijk_evening.length;
  console.log(`📊 Total clients in Excel: ${totalClientCount}`);
  
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
    getRouteInfoForCustomer: isKnownClient,
    usesDanishCarts: usesDanishCarts,
    getDepartureTime: getDepartureTime,
    getCartCapacity: getCartCapacity,
    showUnmappedCustomersSummary: showUnmappedCustomersSummary,
    isKnownClient: isKnownClient,
    separateOrdersByClientMatch: separateOrdersByClientMatch,
    inferPeriodFromOrder: inferPeriodFromOrder,
    CLIENT_ROUTE_MAPPING: CLIENT_ROUTE_MAPPING,
    DANISH_CART_CLIENTS: DANISH_CART_CLIENTS,
    ROUTE_DEPARTURE_TIMES: ROUTE_DEPARTURE_TIMES,
    LATE_DELIVERY_CLIENTS: LATE_DELIVERY_CLIENTS
  };
  
  console.log('✅ Route mapping loaded successfully!');
  console.log('   Rijnsburg (morning):', CLIENT_ROUTE_MAPPING.rijnsburg_morning.length, 'clients');
  console.log('   Aalsmeer (morning):', CLIENT_ROUTE_MAPPING.aalsmeer_morning.length, 'clients');
  console.log('   Naaldwijk (morning):', CLIENT_ROUTE_MAPPING.naaldwijk_morning.length, 'clients');
  console.log('   Rijnsburg (evening):', CLIENT_ROUTE_MAPPING.rijnsburg_evening.length, 'clients');
  console.log('   Aalsmeer (evening):', CLIENT_ROUTE_MAPPING.aalsmeer_evening.length, 'clients');
  console.log('   Naaldwijk (evening):', CLIENT_ROUTE_MAPPING.naaldwijk_evening.length, 'clients');
  console.log('   TOTAL:',
    CLIENT_ROUTE_MAPPING.rijnsburg_morning.length +
    CLIENT_ROUTE_MAPPING.aalsmeer_morning.length +
    CLIENT_ROUTE_MAPPING.naaldwijk_morning.length +
    CLIENT_ROUTE_MAPPING.rijnsburg_evening.length +
    CLIENT_ROUTE_MAPPING.aalsmeer_evening.length +
    CLIENT_ROUTE_MAPPING.naaldwijk_evening.length,
    'Excel-mapped clients (ONLY these are processed)');
  console.log('   Danish cart clients:', DANISH_CART_CLIENTS.length);
  console.log('   ⚠️ CRITICAL: Only Excel-mapped clients are processed!');
  console.log('   ⚠️ All other orders go to DUMP BASKET!');
}

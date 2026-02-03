/**
 * Client to Route Mapping
 * Source: Planningstabel 2.0 - Official planning sheet from Zuidplas
 * These client-hub assignments are PERMANENT and don't change
 */

const CLIENT_ROUTE_MAPPING = {
  // ========================================
  // RIJNSBURG ROUTE (09:00 departure)
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
    'WM',
    'Zandbergen',
    'MM Flowers',
    'Dijk Flora',
    'Superflora',
    'Flamingo'
  ],
  
  // ========================================
  // NAALDWIJK ROUTE (11:00 departure)
  // TODO: Add client names from Naaldwijk tab in Excel file
  // ========================================
  'naaldwijk': [
    // Will be filled from CSV Naaldwijk section when available
  ]
};

// Danish cart clients (these use special larger carts)
const DANISH_CART_CLIENTS = [
  'Superflora',
  'Flamingo',
  'Flower Trade Consult Bleiswijk',
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
 * Get route for a customer using FUZZY MATCHING
 * API customer names might be slightly different from planning sheet
 */
function getRouteForCustomer(customerName) {
  if (!customerName) {
    console.warn('⚠️ No customer name provided, defaulting to Rijnsburg');
    return 'rijnsburg'; // Default
  }
  
  const nameLower = customerName.toLowerCase().trim();
  
  // Check late delivery clients first
  for (const lateClient of LATE_DELIVERY_CLIENTS) {
    const lateClientLower = lateClient.toLowerCase();
    if (nameLower.includes(lateClientLower) || lateClientLower.includes(nameLower)) {
      console.log(`✅ Late delivery client: "${customerName}" → late_delivery`);
      return 'late_delivery';
    }
  }
  
  // Check each route
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      const clientLower = client.toLowerCase().trim();
      
      // Method 1: Exact match
      if (nameLower === clientLower) {
        console.log(`✅ Exact match: "${customerName}" → ${route}`);
        return route;
      }
      
      // Method 2: Customer name contains client name
      if (nameLower.includes(clientLower)) {
        console.log(`✅ Contains match: "${customerName}" contains "${client}" → ${route}`);
        return route;
      }
      
      // Method 3: Client name contains customer name
      if (clientLower.includes(nameLower)) {
        console.log(`✅ Reverse match: "${client}" contains "${customerName}" → ${route}`);
        return route;
      }
      
      // Method 4: Partial word match (for names like "H. Star" vs "H Star Naaldwijk")
      const customerWords = nameLower.split(/[\s\.\-]+/).filter(w => w.length > 2);
      const clientWords = clientLower.split(/[\s\.\-]+/).filter(w => w.length > 2);
      
      let matchCount = 0;
      for (const cw of customerWords) {
        if (clientWords.some(clw => clw.includes(cw) || cw.includes(clw))) {
          matchCount++;
        }
      }
      
      // If at least 2 words match, consider it a match
      if (matchCount >= 2) {
        console.log(`✅ Word match (${matchCount} words): "${customerName}" ≈ "${client}" → ${route}`);
        return route;
      }
    }
  }
  
  // No match found - log warning and default to rijnsburg
  console.warn(`⚠️ Customer "${customerName}" not found in any route mapping, defaulting to Rijnsburg`);
  return 'rijnsburg';
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
    CLIENT_ROUTE_MAPPING: CLIENT_ROUTE_MAPPING,
    DANISH_CART_CLIENTS: DANISH_CART_CLIENTS,
    ROUTE_DEPARTURE_TIMES: ROUTE_DEPARTURE_TIMES,
    LATE_DELIVERY_CLIENTS: LATE_DELIVERY_CLIENTS
  };
  
  console.log('✅ Route mapping loaded:', Object.keys(CLIENT_ROUTE_MAPPING).length, 'routes');
  console.log('   Rijnsburg:', CLIENT_ROUTE_MAPPING.rijnsburg.length, 'clients');
  console.log('   Aalsmeer:', CLIENT_ROUTE_MAPPING.aalsmeer.length, 'clients');
  console.log('   Naaldwijk:', CLIENT_ROUTE_MAPPING.naaldwijk.length, 'clients');
  console.log('   Danish cart clients:', DANISH_CART_CLIENTS.length);
}

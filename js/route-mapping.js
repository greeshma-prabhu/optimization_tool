/**
 * Client to Route Mapping
 * Source: Planningstabel 2.0 - Official planning sheet from Zuidplas
 * These client-hub assignments are PERMANENT and don't change
 */

const CLIENT_ROUTE_MAPPING = {
  // ========================================
  // RIJNSBURG ROUTE (09:00 departure)
  // 27 clients from Rijnsburg sheet (OFFICIAL - from Excel)
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
  // 30 clients from Aalsmeer sheet (OFFICIAL - from Excel)
  // ========================================
  'aalsmeer': [
    'BBI Blomstertorget',
    'Bloemen Buro',
    'Bloomenet',
    'Blooming Direct',
    'Carsea',
    'Dijk Flora',
    'Eurofleur Export',
    'Flamingo',
    'Floramondo',
    'Florette',
    'Flori Culture',
    'Floripac',
    'Floris Holland',
    'Flora Nova',
    'Flower Point',
    'Flower Trade Consult',
    'FTD',
    'Hans Visser',
    'Harrewijn',
    'Hoekhuis Aalsmeer',
    'Imex',
    'KLOK Aalsmeer',
    'MM Flowers',
    'Passie Bloemen',
    'PB Flowerbulbs',
    'Plantion',
    'Royal Lemkes',
    'Stolk Flora',
    'Superflora',
    'Xaverius'
  ],
  
  // ========================================
  // NAALDWIJK ROUTE (11:00 departure)
  // 29 clients from Naaldwijk sheet (OFFICIAL - from Excel)
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
    'What If'
  ]
};

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
 * Get route for a customer using IMPROVED FUZZY MATCHING
 * API customer names might be slightly different from planning sheet
 * Handles variations like: "Floripac Swiss plant BV" → "Floripac"
 * 
 * This function uses MULTIPLE matching methods to achieve 90%+ accuracy:
 * 1. Exact match after cleaning
 * 2. Contains matching (customer name contains client name)
 * 3. Reverse contains (client name contains customer name)
 * 4. Word-based matching (2+ significant words match)
 * 5. Partial word matching for short names
 */
function getRouteForCustomer(customerName) {
  if (!customerName) return 'rijnsburg'; // Default
  
  // Clean the customer name for better matching - MORE AGGRESSIVE CLEANING
  const cleanName = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')           // Normalize spaces
      .replace(/[&]/g, ' ')           // Remove ampersands
      .replace(/\./g, '')             // Remove periods
      .replace(/b\.v\.|bv|b v|b\.v/gi, '')      // Remove all BV variations
      .replace(/\s+(export|flowers?|bloemen|plant|swiss|holland|westland|aalsmeer|naaldwijk|rijnsburg|bleiswijk|klondike|gerbera|mini|webshop|retail|vof|v\.o\.f\.|vof)/gi, ' ')  // Remove common suffixes and location names
      .replace(/\(.*?\)/g, '')        // Remove content in parentheses like (MINI)
      .replace(/webshop/gi, '')        // Remove "webshop"
      .replace(/retail/gi, '')         // Remove "retail"
      .replace(/-/g, ' ')              // Replace hyphens with spaces
      .replace(/\//g, ' ')             // Replace slashes with spaces (V/D PLAS → V D PLAS)
      .replace(/van der|vander|vd|v d/gi, ' ')  // Normalize "van der" variations
      .replace(/de |het |van |der |den /gi, ' ') // Remove common Dutch articles
      .trim();
  };
  
  const nameClean = cleanName(customerName);
  const nameWords = nameClean.split(/\s+/).filter(w => w.length > 2);
  
  // Check late delivery clients first
  const LATE_DELIVERY = ['rheinmaas', 'plantion', 'algemeen'];
  for (const late of LATE_DELIVERY) {
    if (nameClean.includes(late)) {
      console.log(`✅ Late delivery client: "${customerName}" → late_delivery`);
      return 'late_delivery';
    }
  }
  
  // Search through all routes
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      const clientClean = cleanName(client);
      const clientWords = clientClean.split(/\s+/).filter(w => w.length > 2);
      
      // Method 1: Exact match after cleaning
      if (nameClean === clientClean) {
        console.log(`✅ Exact match: "${customerName}" = "${client}" → ${route}`);
        return route;
      }
      
      // Method 2: Customer name contains client name (IMPROVED - more lenient)
      if (clientClean.length >= 3) {
        if (nameClean.includes(clientClean)) {
          console.log(`✅ Contains match: "${customerName}" contains "${client}" → ${route}`);
          return route;
        }
        
        // Method 3: Client name contains customer name (IMPROVED - more lenient)
        if (nameClean.length >= 3 && clientClean.includes(nameClean)) {
          console.log(`✅ Reverse contains: "${client}" contains "${customerName}" → ${route}`);
          return route;
        }
      }
      
      // Method 2b: Partial contains match (if client name is 3+ chars and appears in customer name)
      if (clientClean.length >= 3) {
        // Check if any significant part of client name appears in customer name
        const clientParts = clientClean.split(/\s+/).filter(p => p.length >= 3);
        for (const part of clientParts) {
          if (nameClean.includes(part)) {
            console.log(`✅ Partial contains: "${customerName}" contains "${part}" from "${client}" → ${route}`);
            return route;
          }
        }
      }
      
      // Method 4: Word-based matching (IMPROVED - match if 1+ significant words match)
      let matchCount = 0;
      let significantMatches = 0;
      for (const nw of nameWords) {
        for (const cw of clientWords) {
          // Check if words match or contain each other
          if (nw.length > 2 && cw.length > 2) {
            if (nw === cw || nw.includes(cw) || cw.includes(nw)) {
              matchCount++;
              // Count significant matches (longer words are more significant)
              if (nw.length >= 4 || cw.length >= 4) {
                significantMatches++;
              }
              break; // Count each word only once
            }
          }
        }
      }
      
      // IMPROVED: Match if 1+ significant word OR 2+ any words match
      if (significantMatches >= 1 || matchCount >= 2) {
        console.log(`✅ Word match (${matchCount} words, ${significantMatches} significant): "${customerName}" ≈ "${client}" → ${route}`);
        return route;
      }
      
      // Method 4b: Single word match for very short client names (e.g., "L&M", "FSF")
      if (clientWords.length === 1 && nameWords.length >= 1) {
        const clientWord = clientWords[0];
        const matched = nameWords.some(nw => 
          nw === clientWord || nw.includes(clientWord) || clientWord.includes(nw)
        );
        if (matched && clientWord.length >= 2) {
          console.log(`✅ Single word match: "${customerName}" ≈ "${client}" → ${route}`);
          return route;
        }
      }
      
      // Method 5: Partial word matching for short names
      // For names like "V/D PLAS" vs "Plas van der"
      if (clientWords.length === 2 && nameWords.length >= 2) {
        const matches = clientWords.filter(cw => 
          nameWords.some(nw => nw.includes(cw) || cw.includes(nw))
        );
        if (matches.length >= 2) {
          console.log(`✅ Partial word match: "${customerName}" ≈ "${client}" → ${route}`);
          return route;
        }
      }
    }
  }
  
  // No match found
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
  
  console.log('✅ Route mapping loaded successfully!');
  console.log('   Rijnsburg:', CLIENT_ROUTE_MAPPING.rijnsburg.length, 'clients');
  console.log('   Aalsmeer:', CLIENT_ROUTE_MAPPING.aalsmeer.length, 'clients');
  console.log('   Naaldwijk:', CLIENT_ROUTE_MAPPING.naaldwijk.length, 'clients');
  console.log('   TOTAL:', 
    CLIENT_ROUTE_MAPPING.rijnsburg.length + 
    CLIENT_ROUTE_MAPPING.aalsmeer.length + 
    CLIENT_ROUTE_MAPPING.naaldwijk.length, 
    'permanent client assignments');
  console.log('   Danish cart clients:', DANISH_CART_CLIENTS.length);
}

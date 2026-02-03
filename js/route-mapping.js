/**
 * Client to Route Mapping
 * Source: Planningstabel 2.0 Excel file
 * Each client is permanently assigned to a hub location
 */

const CLIENT_ROUTE_MAPPING = {
  // Rijnsburg clients (09:00 departure)
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
    'Sorisso',
    'Sorisso Verde',
    'Verde Star',
    'T. Star',
    'Star T.',
    'v/d Gugten',
    'Star v/d Gugten',
    'V/D PLAS',
    'V&E Export',
    'Vianen',
    'St. Gabriel'
  ],
  
  // Aalsmeer clients (10:00 departure)
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
  
  // Naaldwijk clients (11:00 departure)
  'naaldwijk': [
    // TODO: Add client names from Naaldwijk tab in Excel file
    // Currently empty - will default to rijnsburg if not found
  ],
  
  // Special late delivery clients
  'late_delivery': [
    'Rheinmaas',
    'Plantion',
    'Algemeen'
  ]
};

// Departure times per route
const ROUTE_DEPARTURE_TIMES = {
  'rijnsburg': '09:00',
  'aalsmeer': '10:00',
  'naaldwijk': '11:00',
  'late_delivery': 'End middag / avond'
};

/**
 * Get route for a customer name
 * Uses fuzzy matching because API names might be slightly different
 */
function getRouteForCustomer(customerName) {
  if (!customerName) {
    console.warn('⚠️ No customer name provided, defaulting to Rijnsburg');
    return 'rijnsburg'; // Default
  }
  
  const nameLower = customerName.toLowerCase().trim();
  
  // Check each route's client list
  for (const [route, clients] of Object.entries(CLIENT_ROUTE_MAPPING)) {
    for (const client of clients) {
      const clientLower = client.toLowerCase().trim();
      
      // Exact match
      if (nameLower === clientLower) {
        console.log(`✅ Customer "${customerName}" → route: ${route}`);
        return route;
      }
      
      // Partial match (customer name contains client name or vice versa)
      if (nameLower.includes(clientLower) || clientLower.includes(nameLower)) {
        console.log(`✅ Customer "${customerName}" → route: ${route} (partial match with "${client}")`);
        return route;
      }
    }
  }
  
  // Default to rijnsburg if no match found
  console.warn(`⚠️ Customer "${customerName}" not found in route mapping, defaulting to Rijnsburg`);
  return 'rijnsburg';
}

/**
 * Get departure time for a route
 */
function getDepartureTime(route) {
  return ROUTE_DEPARTURE_TIMES[route] || '09:00';
}

// Export
if (typeof window !== 'undefined') {
  window.RouteMapping = {
    getRouteForCustomer: getRouteForCustomer,
    getDepartureTime: getDepartureTime,
    CLIENT_ROUTE_MAPPING: CLIENT_ROUTE_MAPPING,
    ROUTE_DEPARTURE_TIMES: ROUTE_DEPARTURE_TIMES
  };
}


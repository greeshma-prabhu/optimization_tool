/**
 * Zuidplas Logistics - Static Business Data
 * Routes, clients, capacities, and business rules
 */

const ROUTES = {
    rijnsburg: {
        id: 1,
        name: 'Rijnsburg',
        hub: 'Royal FloraHolland Rijnsburg',
        departureTime: '09:00',
        type: 'single_hub',
        clients: 27,
        clientList: [
            'A. Heemskerk', 'Aad van Duijn', 'Albert Noort', 'Bohemen',
            'C van Klaveren', 'C.W de Mooij', 'Floral Sourcing', 'H. Star',
            'Hermes Bloemen', 'Heyer', 'Hoek groothandel', 'Hollandirect',
            'Kariflex', 'kooter', 'L&M', 'Maat & Zoon', 'Nagel',
            'Nic den Heijer', 'Jason Walters', 'Retail Flower', 'Sorisso Verde',
            'Star T.', 'Star v/d Gugten', 'V/D PLAS', 'V&E Export', 'Vianen', 'St. Gabriel'
        ],
        typicalTruck: 'external',
        notes: 'Single hub delivery - customers collect from there'
    },
    aalsmeer: {
        id: 2,
        name: 'Aalsmeer',
        hub: 'Royal FloraHolland Aalsmeer',
        departureTime: '10:00',
        type: 'multiple_dropoff',
        clients: 47,
        clientList: [
            'Akkus', 'Albert Heijn', 'Behne Blumen', 'By Special', 'Bloomon',
            'Directflor', 'Divflo', 'Fleura Metz', 'Flora Service', 'EZ Flower',
            'Floral Connection', 'Floris Holland', 'Floral Charm', 'Hans Visser',
            'Hans Visser P', 'Hans Visser B', 'Greenflor', 'hilverda de boer',
            'holex', 'Hoekhuis Aalsmeer', 'Intratuin', 'IBH', 'Lem', 'F.T.C. Aalsmeer',
            'KUB Flowers', 'Hoorn', 'OZ Zurel', 'Nijssen', 'PS Flowers', 'Roelofs',
            'salaba/barile', 'Slikweid', 'Spaargaren', 'Transfleur', 'Thom Slootman',
            'Tuning', 'verbeek en bol', 'Vliet', 'Vimex', 'Verdnatura', 'waterdrinker',
            'Willemsen', 'WM', 'Zandbergen', 'MM Flowers', 'Dijk Flora'
        ],
        specialCustomers: {
            directBox: ['MM Flowers', 'Dijk Flora']
        },
        typicalTruck: 'own-truck-2',
        notes: 'Multiple drop-off points - deliver to different customers'
    },
    naaldwijk: {
        id: 3,
        name: 'Naaldwijk',
        hub: 'Royal FloraHolland Naaldwijk',
        departureTime: '11:00',
        type: 'mixed',
        clients: 'TBD',
        clientList: [], // TODO: Get from Excel
        specialLocations: ['MM Flowers', 'Dijk Flora'],
        typicalTruck: 'own-truck-1-returning',
        notes: 'Mixed - some clients at different location'
    },
    rijnsburg_evening: {
        id: 4,
        name: 'Rijnsburg (Avond)',
        hub: 'Royal FloraHolland Rijnsburg',
        departureTime: '17:00',
        type: 'single_hub',
        clients: 15,
        clientList: [],
        typicalTruck: 'external',
        notes: 'Evening route'
    },
    aalsmeer_evening: {
        id: 5,
        name: 'Aalsmeer (Avond)',
        hub: 'Royal FloraHolland Aalsmeer',
        departureTime: '18:00',
        type: 'multiple_dropoff',
        clients: 30,
        clientList: [],
        typicalTruck: 'own-truck-2',
        notes: 'Evening route'
    },
    naaldwijk_evening: {
        id: 6,
        name: 'Naaldwijk (Avond)',
        hub: 'Royal FloraHolland Naaldwijk',
        departureTime: '19:00',
        type: 'mixed',
        clients: 23,
        clientList: [],
        typicalTruck: 'own-truck-1-returning',
        notes: 'Evening route'
    }
};

const DANISH_CART_CUSTOMERS = [
    'Superflora',
    'Flamingo',
    'Flower Trade Consult Bleiswijk',
    'MM Flowers',
    'Dijk Flora'
];

const DIRECT_BOX_CUSTOMERS = [
    'MM Flowers',
    'Dijk Flora'
];

const CART_CAPACITIES = {
    standard: {
        '612': 72,  // 3 layers × 24
        '575': 32,  // Can add extra layer: 16×612 or 10×902
        '902': 40,  // 4 layers × 10
        '588': 40,  // auction only
        '996': 32,  // Can add extra: 10×902 or 12×612
        '856': 20
    },
    danish: 24  // 4 layers × 6
};

// Package types available
const PACKAGE_TYPES = ['612', '575', '996', '902', '996', '856'];

// Special handling flags (Legenda)
const SPECIAL_HANDLING = {
    'Apart Houden': 'Keep separate',
    'Vroeg!': 'Early priority',
    'Caac 1': 'Classification 1',
    'Caac 2': 'Classification 2',
    'Caac 3': 'Classification 3',
    'Caac 4': 'Classification 4',
    'Caac 5': 'Classification 5'
};

const TRUCKS = {
    own: [
        {
            id: 'own-truck-1',
            name: 'Own Truck #1',
            type: 'own',
            capacity: 17,
            costPerRoute: 150, // €150 per route
            available: true
        },
        {
            id: 'own-truck-2',
            name: 'Own Truck #2',
            type: 'own',
            capacity: 17,
            costPerRoute: 150,
            available: true
        }
    ],
    neighbor: [
        {
            id: 'neighbor-truck',
            name: "Neighbor's Truck",
            type: 'neighbor',
            capacity: 17,
            costPerRoute: 0, // Free partnership
            available: null, // Needs manual check
            requiresAction: '📞 Call neighbor to confirm'
        }
    ],
    external: [
        {
            id: 'external-truck',
            name: 'External Truck',
            type: 'external',
            capacity: 17,
            costPerRoute: 250, // €250 per trip
            available: true
        }
    ]
};

const COSTS = {
    ownTruckPerRoute: 150,
    externalTruckPerTrip: 250,
    neighborTruck: 0,
    externalCarrierPerCart: 25
};

const BUSINESS_RULES = {
    maxStandardCarts: 17,
    maxCartsWithDanish: 16, // When >6 Danish carts used
    danishThreshold: 6,
    danishToStandardRatio: 2, // 2 Danish = 1 Standard
    loadingTime: '1 hour',
    orderCutoff: '6:00 AM',
    orderSpacing: true, // 1 package space between different orders
    singleOrderCanFillCart: true
};

/**
 * DUMMY ORDER DATA for testing and demonstration
 * Realistic sample orders covering all scenarios
 */
const DUMMY_ORDERS = [
    // RIJNSBURG ROUTE (09:00) - Standard carts
    {
        id: 'ORD-001',
        orderNumber: 'RJS-2026-001',
        customer: 'A. Heemskerk',
        customerName: 'A. Heemskerk',
        deliveryLocation: 'Rijnsburg',
        route: 'rijnsburg',
        productType: 'Roses',
        packageType: '612',
        quantity: 150, // 150 crates = 3 carts (72 per cart)
        crateType: '612',
        cartType: 'standard',
        specialFlags: ['Vroeg!'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-002',
        orderNumber: 'RJS-2026-002',
        customer: 'A. Heemskerk', // Same client - should be on same cart
        customerName: 'A. Heemskerk',
        deliveryLocation: 'Rijnsburg',
        route: 'rijnsburg',
        productType: 'Tulips',
        packageType: '902',
        quantity: 40, // 40 crates = 1 cart (40 per cart)
        crateType: '902',
        cartType: 'standard',
        specialFlags: [],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-003',
        orderNumber: 'RJS-2026-003',
        customer: 'Hermes Bloemen',
        customerName: 'Hermes Bloemen',
        deliveryLocation: 'Rijnsburg',
        route: 'rijnsburg',
        productType: 'Chrysanthemums',
        packageType: '575',
        quantity: 65, // 65 crates = 3 carts (32 per cart)
        crateType: '575',
        cartType: 'standard',
        specialFlags: ['Caac 2'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-004',
        orderNumber: 'RJS-2026-004',
        customer: 'Hollandirect',
        customerName: 'Hollandirect',
        deliveryLocation: 'Rijnsburg',
        route: 'rijnsburg',
        productType: 'Carnations',
        packageType: '996',
        quantity: 96, // 96 crates = 3 carts (32 per cart)
        crateType: '996',
        cartType: 'standard',
        specialFlags: ['Apart Houden'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-005',
        orderNumber: 'RJS-2026-005',
        customer: 'Retail Flower',
        customerName: 'Retail Flower',
        deliveryLocation: 'Rijnsburg',
        route: 'rijnsburg',
        productType: 'Gerberas',
        packageType: '856',
        quantity: 60, // 60 crates = 3 carts (20 per cart)
        crateType: '856',
        cartType: 'standard',
        specialFlags: ['Caac 3'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    
    // AALSMEER ROUTE (10:00) - Mix of Standard and Danish
    {
        id: 'ORD-006',
        orderNumber: 'ALS-2026-001',
        customer: 'Superflora',
        customerName: 'Superflora',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Roses',
        packageType: '612',
        quantity: 48, // 48 crates = 2 Danish carts (24 per cart)
        crateType: '612',
        cartType: 'danish',
        specialFlags: ['Vroeg!'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-007',
        orderNumber: 'ALS-2026-002',
        customer: 'Superflora', // Same client - same cart
        customerName: 'Superflora',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Tulips',
        packageType: '902',
        quantity: 24, // 24 crates = 1 Danish cart
        crateType: '902',
        cartType: 'danish',
        specialFlags: [],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-008',
        orderNumber: 'ALS-2026-003',
        customer: 'Flamingo',
        customerName: 'Flamingo',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Carnations',
        packageType: '612',
        quantity: 72, // 72 crates = 3 Danish carts (24 per cart)
        crateType: '612',
        cartType: 'danish',
        specialFlags: ['Caac 1'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-009',
        orderNumber: 'ALS-2026-004',
        customer: 'MM Flowers',
        customerName: 'MM Flowers',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Roses',
        packageType: '612',
        quantity: 50,
        crateType: '612',
        cartType: 'danish', // Direct in box - uses Danish cart
        specialFlags: ['Direct in Box'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-010',
        orderNumber: 'ALS-2026-005',
        customer: 'Dijk Flora',
        customerName: 'Dijk Flora',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Tulips',
        packageType: '902',
        quantity: 40,
        crateType: '902',
        cartType: 'danish', // Direct in box - uses Danish cart
        specialFlags: ['Direct in Box'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-011',
        orderNumber: 'ALS-2026-006',
        customer: 'Albert Heijn',
        customerName: 'Albert Heijn',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Chrysanthemums',
        packageType: '575',
        quantity: 128, // 128 crates = 4 standard carts (32 per cart)
        crateType: '575',
        cartType: 'standard',
        specialFlags: ['Vroeg!', 'Caac 4'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-012',
        orderNumber: 'ALS-2026-007',
        customer: 'Floral Connection',
        customerName: 'Floral Connection',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Gerberas',
        packageType: '996',
        quantity: 160, // 160 crates = 5 standard carts (32 per cart)
        crateType: '996',
        cartType: 'standard',
        specialFlags: [],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-013',
        orderNumber: 'ALS-2026-008',
        customer: 'Floris Holland',
        customerName: 'Floris Holland',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Roses',
        packageType: '612',
        quantity: 216, // 216 crates = 3 standard carts (72 per cart)
        crateType: '612',
        cartType: 'standard',
        specialFlags: ['Apart Houden'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-014',
        orderNumber: 'ALS-2026-009',
        customer: 'Intratuin',
        customerName: 'Intratuin',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Tulips',
        packageType: '902',
        quantity: 200, // 200 crates = 5 standard carts (40 per cart)
        crateType: '902',
        cartType: 'standard',
        specialFlags: ['Caac 5'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-015',
        orderNumber: 'ALS-2026-010',
        customer: 'Transfleur',
        customerName: 'Transfleur',
        deliveryLocation: 'Aalsmeer',
        route: 'aalsmeer',
        productType: 'Carnations',
        packageType: '856',
        quantity: 100, // 100 crates = 5 standard carts (20 per cart)
        crateType: '856',
        cartType: 'standard',
        specialFlags: [],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    
    // NAALDWIJK ROUTE (11:00) - Standard carts
    {
        id: 'ORD-016',
        orderNumber: 'NAD-2026-001',
        customer: 'MM Flowers', // Special location in Naaldwijk
        customerName: 'MM Flowers',
        deliveryLocation: 'Naaldwijk',
        route: 'naaldwijk',
        productType: 'Roses',
        packageType: '612',
        quantity: 48,
        crateType: '612',
        cartType: 'danish',
        specialFlags: ['Direct in Box'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-017',
        orderNumber: 'NAD-2026-002',
        customer: 'Dijk Flora', // Special location in Naaldwijk
        customerName: 'Dijk Flora',
        deliveryLocation: 'Naaldwijk',
        route: 'naaldwijk',
        productType: 'Tulips',
        packageType: '902',
        quantity: 40,
        crateType: '902',
        cartType: 'danish',
        specialFlags: ['Direct in Box'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-018',
        orderNumber: 'NAD-2026-003',
        customer: 'Flower Trade Consult Bleiswijk',
        customerName: 'Flower Trade Consult Bleiswijk',
        deliveryLocation: 'Naaldwijk',
        route: 'naaldwijk',
        productType: 'Carnations',
        packageType: '612',
        quantity: 72, // 72 crates = 3 Danish carts (24 per cart)
        crateType: '612',
        cartType: 'danish',
        specialFlags: ['External Pickup'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-019',
        orderNumber: 'NAD-2026-004',
        customer: 'Customer A',
        customerName: 'Customer A',
        deliveryLocation: 'Naaldwijk',
        route: 'naaldwijk',
        productType: 'Chrysanthemums',
        packageType: '575',
        quantity: 96, // 96 crates = 3 standard carts (32 per cart)
        crateType: '575',
        cartType: 'standard',
        specialFlags: [],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    },
    {
        id: 'ORD-020',
        orderNumber: 'NAD-2026-005',
        customer: 'Customer B',
        customerName: 'Customer B',
        deliveryLocation: 'Naaldwijk',
        route: 'naaldwijk',
        productType: 'Gerberas',
        packageType: '996',
        quantity: 128, // 128 crates = 4 standard carts (32 per cart)
        crateType: '996',
        cartType: 'standard',
        specialFlags: ['Vroeg!', 'Caac 2'],
        status: 'pending',
        deliveryDate: new Date().toISOString().split('T')[0]
    }
];

// Make DUMMY_ORDERS globally accessible
window.DUMMY_ORDERS = DUMMY_ORDERS;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ROUTES,
        DANISH_CART_CUSTOMERS,
        DIRECT_BOX_CUSTOMERS,
        CART_CAPACITIES,
        TRUCKS,
        COSTS,
        BUSINESS_RULES,
        DUMMY_ORDERS
    };
}

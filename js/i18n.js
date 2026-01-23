/**
 * Zuidplas Logistics - Internationalization (i18n)
 * Dutch and English language support
 */

const translations = {
    en: {
        // Navigation
        nav: {
            dashboard: 'Dashboard',
            orders: 'Orders',
            optimization: 'Optimization',
            cartOptimization: 'Cart Optimization',
            cartLoading: 'Cart Loading',
            trucks: 'Trucks',
            costs: 'Costs'
        },
        // Dashboard
        dashboard: {
            title: 'Route Optimization System',
            subtitle: 'Optimize truck allocation across 3 routes - Fit all carts efficiently',
            syncOrders: 'Sync Orders from API',
            loadDemo: 'Load Demo Data',
            selectDate: 'Select Date:',
            todayOrders: "Today's Orders",
            totalCarts: 'Total Carts Needed',
            routesStatus: 'Routes Status',
            optimizationScore: 'Optimization Score',
            routeOverview: 'Route Overview',
            optimizationSuggestions: 'Optimization Suggestions',
            authenticated: 'Authenticated (JWT)',
            demoMode: 'Demo Mode',
            authFailed: 'Auth Failed',
            clickToSync: 'Click "Sync Orders from API" to fetch real orders, or "Load Demo Data" to test with sample orders',
            noRouteData: 'No route data available',
            noSuggestions: 'No optimization suggestions available'
        },
        // Orders
        orders: {
            title: 'Daily Orders',
            syncNow: 'Sync Now',
            exportCSV: 'Export CSV',
            lastSynced: 'Last synced:',
            filterBy: 'Filter by:',
            filters: 'Filters',
            search: 'Search orders...',
            orderId: 'Order ID',
            customer: 'Customer',
            deliveryLocation: 'Delivery Location',
            productType: 'Product Type',
            quantity: 'Quantity',
            cartType: 'Cart Type',
            crateType: 'Crate Type',
            route: 'Route',
            status: 'Status',
            noOrders: 'No orders found',
            ordersTable: 'Orders Table',
            cartsNeeded: 'Carts Needed',
            assignedRoute: 'Assigned Route',
            clickToSync: 'Click "Sync Now" to fetch orders from API',
            ordersFor: 'Orders for',
            allRoutes: 'All Routes',
            allTypes: 'All Types',
            allStatus: 'All Status',
            pending: 'Pending',
            assigned: 'Assigned',
            standardCarts: 'Standard Carts',
            danishCarts: 'Danish Carts',
            specialHandling: 'Special Handling'
        },
        // Cart Loading
        cartLoading: {
            title: 'Cart Optimization',
            subtitle: 'Place all carts on 2 trucks - Cover all 3 routes efficiently',
            optimize: 'Optimize Cart Loading',
            totalCarts: 'Total Carts',
            cartsAssigned: 'Carts Assigned',
            overflow: 'Overflow',
            routesCovered: 'Routes Covered',
            truck1: 'Truck 1',
            noOrdersMessage: 'No orders loaded. Go to Dashboard to load orders.',
            loadOrdersFirst: 'Load orders from Dashboard first.',
            truck2: 'Truck 2',
            fits: 'Fits',
            overflow: 'Overflow',
            standard: 'Standard',
            standardCart: 'Standard Cart',
            standardCarts: 'Standard Carts',
            danish: 'Danish',
            danishCart: 'Danish Cart',
            danishCarts: 'Danish Carts',
            cartsByRoute: 'Carts by Route',
            noAllocation: 'No allocation yet',
            needsOrders: 'Please load orders first from Dashboard',
            optimizeButton: 'Optimize Cart Loading',
            clientColors: 'Client Colors',
            truck: 'Truck'
        },
        // Carts
        carts: {
            danishCapacityWarning: '⚠️ More than {0} Danish carts - capacity reduced to {1}'
        },
        // Optimization
        optimization: {
            title: 'Route Optimization Engine',
            subtitle: 'Automated route planning and truck allocation',
            runOptimization: 'Run Optimization',
            inputSummary: 'Input Summary',
            totalOrders: 'Total Orders',
            totalCarts: 'Total Carts',
            danishCarts: 'Danish Carts',
            standardCarts: 'Standard Carts',
            routeBreakdown: 'Route Breakdown',
            optimizationOptions: 'Optimization Options',
            optimizationScore: 'Optimization Score',
            clickToGenerate: 'Click "Run Optimization" to generate scenarios',
            orders: 'Orders',
            cartsNeeded: 'Carts Needed',
            cartTypes: 'Cart Types',
            status: 'Status',
            fits: 'Fits',
            overflow: 'Overflow',
            allocation: 'Allocation',
            pros: 'Pros',
            cons: 'Cons',
            recommended: 'Recommended',
            alternative: 'Alternative',
            callNeighbor: 'Call Neighbor',
            allFits: 'All fits',
            standardAllocation: 'Standard Allocation',
            defaultDescription: 'All carts fit in 2 own trucks - Truck 1 does Route 1 then Route 3, Truck 2 does Route 2',
            neighborTruck: "Neighbor's Truck",
            neighborDescription: "Use neighbor's truck for Route 1 (free), own trucks for Routes 2 & 3",
            allRoutesFit: 'All routes fit within capacity',
            overflowCarrier: 'Overflow via External Carrier',
            overflowCarrierDescription: 'Route {0} ({1}): {2} carts via external carrier, rest in own truck',
            overflowHandled: '{0} overflow carts handled via external carrier',
            minimalExtraCost: 'Minimal extra cost',
            usesOwnTrucks: 'Uses own trucks efficiently',
            guaranteedCapacity: 'Guaranteed capacity',
            requiresExternalBooking: 'Requires external carrier booking',
            splitDelivery: 'Split delivery for overflow route',
            externalTruckForRoute: 'External Truck for Overflow Route',
            externalTruckDescription: 'Use external truck for entire Route {0} ({1})',
            fullRouteExternal: 'Full route handled by external truck',
            simpleSolution: 'Simple solution',
            noSplitDelivery: 'No split delivery',
            noOrdersForRoute: 'No orders for this route',
            needsAdditionalCarts: 'Needs',
            additionalCarts: 'additional carts',
            suggestExternal: 'Suggest external carrier',
            option: 'Option'
        },
        // Trucks
        trucks: {
            title: 'Truck Fleet Management',
            subtitle: 'Monitor truck status and cart loading',
            ownTruck: 'Own Truck',
            neighborTruck: "Neighbor's Truck",
            externalTruck: 'External Truck',
            available: 'Available',
            inUse: 'In Use',
            capacity: 'Capacity',
            carts: 'carts',
            perRoute: 'per route',
            todayAllocation: "Today's Allocation",
            noAllocation: 'No allocation yet',
            callNeighbor: 'Call Neighbor',
            confirmAvailability: 'Call neighbor to confirm',
            cartLoadingViz: 'Cart Loading Visualization',
            runOptimizationToSee: 'Run optimization to see cart loading visualization',
            callNeighborMessage: '📞 Call neighbor to confirm truck availability for Route 1 (Rijnsburg - 9:00 AM)',
            departure: 'Departure',
            return: 'Return',
            scheduled: 'Scheduled',
            truckLoadingByRoute: 'Truck Loading by Route'
        },
        // Costs
        costs: {
            title: 'Cost Analysis',
            subtitle: 'Optimize transportation costs',
            ownTruck: 'Own Truck',
            externalTruck: 'External Truck',
            neighborTruck: "Neighbor's Truck",
            externalCarrier: 'External Carrier',
            perRoute: 'per route',
            perTrip: 'per trip',
            freePartnership: 'free partnership',
            perCart: 'per cart',
            costOptimizationTips: 'Cost Optimization Tips',
            dailyCostAnalysis: 'Daily Cost Analysis:',
            recommendedOption: 'Recommended option:',
            cheapestOption: 'Cheapest option:',
            potentialMonthlySavings: 'Potential monthly savings:',
            ifUsingCheapestOption: 'if using cheapest option',
            averageDailyCost: 'Average daily cost:',
            perDay: 'per day',
            loadOrdersTip: 'Load orders and run optimization to see cost-saving recommendations',
            costSavingsOpportunity: 'Cost Savings Opportunity',
            savingsOpportunity: 'Consider "{0}" to save €{1} per day (€{2} per month)',
            neighborTruckAvailable: "Neighbor's Truck Available",
            neighborTruckSaves: 'Using neighbor\'s truck for Route 1 saves €{0} compared to external truck',
            perDay: 'per day',
            costComparison: 'Cost Comparison',
            costFactors: 'Cost Factors'
        },
        // Login
        login: {
            subtitle: 'Log in to get started',
            username: 'Username',
            password: 'Password',
            usernamePlaceholder: 'e.g. JeroenMainfact',
            passwordPlaceholder: 'Enter your password',
            selectLanguage: 'Select Language',
            skipLogin: 'Demo Mode (Without Login)',
            languageNote: 'This language will be used for the entire application',
            orUseDemo: 'Or use demo mode without logging in',
            demoNote: 'Note: Your selected language will be saved'
        },
        // Common
        common: {
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            warning: 'Warning',
            info: 'Info',
            save: 'Save',
            cancel: 'Cancel',
            close: 'Close',
            login: 'Login',
            logout: 'Logout',
            language: 'Language',
            english: 'English',
            dutch: 'Nederlands',
            notAuthenticated: 'Not Authenticated',
            demoMode: 'Demo Mode',
            view: 'View',
            viewDetails: 'View Details',
            feasibility: 'Feasibility',
            ready: 'Ready',
            tight: 'Tight',
            unknown: 'Unknown',
            tbd: 'TBD',
            confirmLogout: 'Are you sure you want to logout?',
            equivalent: 'equivalent',
            max: 'max',
            client: 'Client',
            customer: 'Customer',
            unknown: 'Unknown'
        },
        // Status
        status: {
            overflow: 'Overflow',
            fits: 'Fits',
            utilized: 'utilized'
        },
        // Demo Data - Dynamic content
        data: {
            standardCarts: 'Standard Carts',
            danishCarts: 'Danish Carts',
            specialHandling: 'Special Handling',
            pending: 'Pending',
            completed: 'Completed',
            inProgress: 'In Progress',
            assigned: 'Assigned',
            standard: 'Standard',
            danish: 'Danish',
            noTimingPressure: 'No timing pressure',
            saferSchedule: 'Safer schedule',
            truckAvailableForRoute: 'Truck {0} available for Route {1}',
            higherCost: 'Higher cost',
            externalDependency: 'External dependency',
            overflowHandling: 'Overflow Handling',
            externalTruckForRoute: 'External Truck for Route {0}',
            noProsListed: 'No pros listed',
            noConsListed: 'No cons listed',
            needsAdditionalCarts: 'Needs {0} additional carts via external carrier',
            useExternalTruckDescription: 'Use external truck for Route 1, own trucks for Routes 2 & 3',
            allocation: 'Allocation:',
            pros: 'Pros:',
            cons: 'Cons:',
            score: 'Score:',
            ownTruck: 'Own Truck',
            externalTruck: 'External Truck',
            routeNeeds: 'Route needs {0} carts (overflow: {1})',
            noAllocationYet: 'No allocation yet',
            available: 'Available',
            capacity: 'Capacity',
            carts: 'carts',
            callNeighbor: 'Call Neighbor',
            todayAllocation: "Today's Allocation",
            cartLoadingVisualization: 'Cart Loading Visualization',
            runOptimizationMessage: 'Run optimization to see cart loading visualization',
            perRoute: 'per route',
            usesOwnTrucks: 'Uses own trucks',
            lowestCost: 'Lowest cost',
            efficientTruckUtilization: 'Efficient truck utilization',
            tightTiming: 'Tight timing if Route 1 delayed',
            noBuffer: 'No buffer for delays',
            freeTruck: 'Free truck',
            reliablePartner: 'Reliable partner',
            lowestTotalCost: 'Lowest total cost',
            dependsOnAvailability: 'Depends on availability',
            requiresManualConfirmation: 'Requires manual confirmation'
        }
    },
    nl: {
        // Navigation
        nav: {
            dashboard: 'Dashboard',
            orders: 'Bestellingen',
            optimization: 'Optimalisatie',
            cartOptimization: 'Wagen Optimalisatie',
            cartLoading: 'Wagen Laden',
            trucks: 'Vrachtwagens',
            costs: 'Kosten'
        },
        // Dashboard
        dashboard: {
            title: 'Route Optimalisatie Systeem',
            subtitle: 'Optimaliseer vrachtwagen toewijzing over 3 routes - Plaats alle wagens efficiënt',
            syncOrders: 'Synchroniseer Bestellingen van API',
            loadDemo: 'Laad Demo Data',
            selectDate: 'Selecteer Datum:',
            todayOrders: "Bestellingen Vandaag",
            totalCarts: 'Totaal Wagens Nodig',
            routesStatus: 'Route Status',
            optimizationScore: 'Optimalisatie Score',
            routeOverview: 'Route Overzicht',
            optimizationSuggestions: 'Optimalisatie Suggesties',
            authenticated: 'Geauthenticeerd (JWT)',
            demoMode: 'Demo Modus',
            authFailed: 'Auth Mislukt',
            clickToSync: 'Klik "Synchroniseer Bestellingen van API" om echte bestellingen op te halen, of "Laad Demo Data" om te testen met voorbeeldbestellingen',
            noRouteData: 'Geen routegegevens beschikbaar',
            noSuggestions: 'Geen optimalisatiesuggesties beschikbaar'
        },
        // Orders
        orders: {
            title: 'Dagelijkse Bestellingen',
            syncNow: 'Nu Synchroniseren',
            exportCSV: 'Exporteer CSV',
            lastSynced: 'Laatst gesynchroniseerd:',
            filterBy: 'Filter op:',
            filters: 'Filters',
            search: 'Zoek bestellingen...',
            orderId: 'Bestelnummer',
            customer: 'Klant',
            deliveryLocation: 'Afleverlocatie',
            productType: 'Product Type',
            quantity: 'Hoeveelheid',
            cartType: 'Wagen Type',
            crateType: 'Krat Type',
            route: 'Route',
            status: 'Status',
            noOrders: 'Geen bestellingen gevonden',
            ordersTable: 'Bestellingen Tabel',
            cartsNeeded: 'Wagens Nodig',
            assignedRoute: 'Toegewezen Route',
            clickToSync: 'Klik "Nu Synchroniseren" om bestellingen van API op te halen',
            ordersFor: 'Bestellingen voor',
            allRoutes: 'Alle Routes',
            allTypes: 'Alle Types',
            allStatus: 'Alle Status',
            pending: 'In Afwachting',
            assigned: 'Toegewezen',
            standardCarts: 'Standaard Wagens',
            danishCarts: 'Deense Wagens',
            specialHandling: 'Speciale Behandeling'
        },
        // Cart Loading
        cartLoading: {
            title: 'Wagen Optimalisatie',
            subtitle: 'Plaats alle karren op 2 vrachtwagens - Bedek alle 3 routes efficiënt',
            optimize: 'Optimaliseer Wagen Laden',
            totalCarts: 'Totaal Wagens',
            cartsAssigned: 'Wagens Toegewezen',
            overflow: 'Overloop',
            routesCovered: 'Routes Bedekt',
            truck1: 'Vrachtwagen 1',
            noOrdersMessage: 'Geen bestellingen geladen. Ga naar Dashboard om bestellingen te laden.',
            loadOrdersFirst: 'Laad eerst bestellingen van het Dashboard.',
            truck2: 'Vrachtwagen 2',
            truck: 'Vrachtwagen',
            fits: 'Past',
            overflow: 'Overloop',
            standard: 'Standaard',
            standardCart: 'Standaard Kar',
            standardCarts: 'Standaard Karren',
            danish: 'Deens',
            danishCart: 'Deense Kar',
            danishCarts: 'Deense Karren',
            customer: 'Klant',
            cartsByRoute: 'Wagens per Route',
            noAllocation: 'Nog geen toewijzing',
            needsOrders: 'Laad eerst bestellingen van Dashboard',
            optimizeButton: 'Optimaliseer Wagen Laden',
            clientColors: 'Klant Kleuren',
            truck: 'Vrachtwagen',
            dontFit: 'passen niet. Overweeg externe vervoerder of buur vrachtwagen.',
            notAssigned: 'Niet Toegewezen'
        },
        // Carts
        carts: {
            danishCapacityWarning: '⚠️ Meer dan {0} Deense karren - capaciteit verlaagd tot {1}'
        },
        // Optimization
        optimization: {
            title: 'Route Optimalisatie Engine',
            subtitle: 'Geautomatiseerde route planning en vrachtwagen toewijzing',
            runOptimization: 'Start Optimalisatie',
            inputSummary: 'Input Samenvatting',
            totalOrders: 'Totaal Bestellingen',
            totalCarts: 'Totaal Wagens',
            danishCarts: 'Deense Wagens',
            standardCarts: 'Standaard Wagens',
            routeBreakdown: 'Route Uitsplitsing',
            optimizationOptions: 'Optimalisatie Opties',
            optimizationScore: 'Optimalisatie Score',
            clickToGenerate: 'Klik "Start Optimalisatie" om scenario\'s te genereren',
            orders: 'Bestellingen',
            cartsNeeded: 'Wagens Nodig',
            cartTypes: 'Wagen Types',
            status: 'Status',
            fits: 'Past',
            overflow: 'Overloop',
            allocation: 'Toewijzing',
            pros: 'Voordelen',
            cons: 'Nadelen',
            recommended: 'Aanbevolen',
            alternative: 'Alternatief',
            callNeighbor: 'Bel Buurman',
            allFits: 'Alles Past',
            noTimingPressure: 'Geen tijdsdruk',
            saferSchedule: 'Veiliger schema',
            truckAvailable: 'Vrachtwagen {0} beschikbaar voor Route {1}',
            higherCost: 'Hogere kosten',
            externalDependency: 'Externe afhankelijkheid',
            efficiency: 'Efficiëntie gebaseerd op kosten, capaciteitsbenutting en haalbaarheid',
            standardAllocation: 'Standaard Toewijzing',
            defaultDescription: 'Alle karren passen in 2 eigen vrachtwagens - Vrachtwagen 1 doet Route 1 dan Route 3, Vrachtwagen 2 doet Route 2',
            neighborTruck: "Buur Vrachtwagen",
            neighborDescription: "Gebruik buur vrachtwagen voor Route 1 (gratis), eigen vrachtwagens voor Routes 2 & 3",
            allRoutesFit: 'Alle routes passen binnen capaciteit',
            overflowCarrier: 'Overloop via Externe Vervoerder',
            overflowCarrierDescription: 'Route {0} ({1}): {2} karren via externe vervoerder, rest in eigen vrachtwagen',
            overflowHandled: '{0} overloop karren afgehandeld via externe vervoerder',
            minimalExtraCost: 'Minimale extra kosten',
            usesOwnTrucks: 'Gebruikt eigen vrachtwagens efficiënt',
            guaranteedCapacity: 'Gegarandeerde capaciteit',
            requiresExternalBooking: 'Vereist externe vervoerder boeking',
            splitDelivery: 'Gesplitste levering voor overloop route',
            externalTruckForRoute: 'Externe Vrachtwagen voor Overloop Route',
            externalTruckDescription: 'Gebruik externe vrachtwagen voor volledige Route {0} ({1})',
            fullRouteExternal: 'Volledige route afgehandeld door externe vrachtwagen',
            simpleSolution: 'Eenvoudige oplossing',
            noSplitDelivery: 'Geen gesplitste levering',
            noOrdersForRoute: 'Geen bestellingen voor deze route',
            needsAdditionalCarts: 'Heeft',
            additionalCarts: 'extra karren nodig',
            suggestExternal: 'Stel externe vervoerder voor',
            option: 'Optie'
        },
        // Trucks
        trucks: {
            title: 'Vrachtwagen Vloot Beheer',
            subtitle: 'Monitor vrachtwagen status en kar belading',
            ownTruck: 'Eigen Vrachtwagen',
            neighborTruck: "Buurman's Vrachtwagen",
            externalTruck: 'Externe Vrachtwagen',
            available: 'Beschikbaar',
            inUse: 'In Gebruik',
            capacity: 'Capaciteit',
            carts: 'karren',
            perRoute: 'per route',
            todayAllocation: "Vandaag's Toewijzing",
            noAllocation: 'Nog geen toewijzing',
            callNeighbor: 'Bel Buurman',
            confirmAvailability: 'Bel buurman om te bevestigen',
            cartLoadingViz: 'Wagen Laden Visualisatie',
            runOptimizationToSee: 'Voer optimalisatie uit om wagen laden visualisatie te zien',
            callNeighborMessage: '📞 Bel buurman om vrachtwagen beschikbaarheid te bevestigen voor Route 1 (Rijnsburg - 9:00)',
            departure: 'Vertrek',
            return: 'Terugkeer',
            scheduled: 'Gepland',
            truckLoadingByRoute: 'Vrachtwagen Laden per Route'
        },
        // Costs
        costs: {
            title: 'Kosten Analyse',
            subtitle: 'Optimaliseer transportkosten',
            ownTruck: 'Eigen Vrachtwagen',
            externalTruck: 'Externe Vrachtwagen',
            neighborTruck: "Buur Vrachtwagen",
            externalCarrier: 'Externe Vervoerder',
            perRoute: 'per route',
            perTrip: 'per rit',
            freePartnership: 'gratis partnerschap',
            perCart: 'per kar',
            costOptimizationTips: 'Kosten Optimalisatie Tips',
            dailyCostAnalysis: 'Dagelijkse Kosten Analyse:',
            recommendedOption: 'Aanbevolen optie:',
            cheapestOption: 'Goedkoopste optie:',
            potentialMonthlySavings: 'Potentiële maandelijkse besparingen:',
            ifUsingCheapestOption: 'bij gebruik van goedkoopste optie',
            averageDailyCost: 'Gemiddelde dagelijkse kosten:',
            perDay: 'per dag',
            loadOrdersTip: 'Laad bestellingen en voer optimalisatie uit om kostenbesparende aanbevelingen te zien',
            costSavingsOpportunity: 'Kostenbesparingsmogelijkheid',
            savingsOpportunity: 'Overweeg "{0}" om €{1} per dag te besparen (€{2} per maand)',
            neighborTruckAvailable: 'Buur Vrachtwagen Beschikbaar',
            neighborTruckSaves: 'Gebruik van buur vrachtwagen voor Route 1 bespaart €{0} vergeleken met externe vrachtwagen',
            perDay: 'per dag',
            costComparison: 'Kosten Vergelijking',
            costFactors: 'Kosten Factoren'
        },
        // Login
        login: {
            subtitle: 'Route Optimalisatie Systeem',
            username: 'Gebruikersnaam',
            password: 'Wachtwoord',
            usernamePlaceholder: 'bijv. JeroenMainfact',
            passwordPlaceholder: 'Voer uw wachtwoord in',
            selectLanguage: 'Selecteer Taal',
            skipLogin: 'Overslaan - Demo Modus',
            languageNote: 'De interface taal kan later worden gewijzigd in instellingen',
            orUseDemo: 'Of gebruik demo modus',
            demoNote: 'Demo modus gebruikt voorbeeldgegevens voor demonstratiedoeleinden'
        },
        // Common
        common: {
            loading: 'Laden...',
            error: 'Fout',
            success: 'Succes',
            warning: 'Waarschuwing',
            info: 'Info',
            save: 'Opslaan',
            cancel: 'Annuleren',
            close: 'Sluiten',
            login: 'Inloggen',
            logout: 'Uitloggen',
            language: 'Taal',
            english: 'English',
            dutch: 'Nederlands',
            notAuthenticated: 'Niet Geauthenticeerd',
            demoMode: 'Demo Modus',
            view: 'Bekijk',
            viewDetails: 'Bekijk Details',
            feasibility: 'Haalbaarheid',
            ready: 'Gereed',
            tight: 'Krap',
            unknown: 'Onbekend',
            tbd: 'Nog Te Bepalen',
            confirmLogout: 'Weet u zeker dat u wilt uitloggen?',
            equivalent: 'equivalent',
            max: 'max',
            client: 'Klant',
            customer: 'Klant'
        },
        // Demo Data - Dynamic content
        data: {
            standardCarts: 'Standaard Karren',
            danishCarts: 'Deense Karren',
            specialHandling: 'Speciale Behandeling',
            pending: 'In Behandeling',
            completed: 'Voltooid',
            inProgress: 'Bezig',
            assigned: 'Toegewezen',
            standard: 'Standaard',
            danish: 'Deens',
            noTimingPressure: 'Geen tijdsdruk',
            saferSchedule: 'Veiliger schema',
            truckAvailableForRoute: 'Vrachtwagen {0} beschikbaar voor Route {1}',
            higherCost: 'Hogere kosten',
            externalDependency: 'Externe afhankelijkheid',
            overflowHandling: 'Overflow Behandeling',
            externalTruckForRoute: 'Externe Vrachtwagen voor Route {0}',
            noProsListed: 'Geen voordelen vermeld',
            noConsListed: 'Geen nadelen vermeld',
            needsAdditionalCarts: 'Heeft {0} extra karren nodig via externe vervoerder',
            useExternalTruckDescription: 'Gebruik externe vrachtwagen voor Route 1, eigen vrachtwagens voor Routes 2 & 3',
            allocation: 'Toewijzing:',
            pros: 'Voordelen:',
            cons: 'Nadelen:',
            score: 'Score:',
            ownTruck: 'Eigen Vrachtwagen',
            externalTruck: 'Externe Vrachtwagen',
            routeNeeds: 'Route heeft {0} karren nodig (overflow: {1})',
            noAllocationYet: 'Nog geen toewijzing',
            available: 'Beschikbaar',
            capacity: 'Capaciteit',
            carts: 'karren',
            callNeighbor: 'Bel Buur',
            todayAllocation: "Vandaag's Toewijzing",
            cartLoadingVisualization: 'Kar Belading Visualisatie',
            runOptimizationMessage: 'Voer optimalisatie uit om kar belading visualisatie te zien',
            perRoute: 'per route',
            usesOwnTrucks: 'Gebruikt eigen vrachtwagens',
            lowestCost: 'Laagste kosten',
            efficientTruckUtilization: 'Efficiënt vrachtwagen gebruik',
            tightTiming: 'Krap tijdsschema als Route 1 vertraagd is',
            noBuffer: 'Geen buffer voor vertragingen',
            freeTruck: 'Gratis vrachtwagen',
            reliablePartner: 'Betrouwbare partner',
            lowestTotalCost: 'Laagste totale kosten',
            dependsOnAvailability: 'Afhankelijk van beschikbaarheid',
            requiresManualConfirmation: 'Vereist handmatige bevestiging'
        }
    }
};

class I18n {
    constructor() {
        // Priority: language > user_language > default (nl)
        this.currentLang = localStorage.getItem('zuidplas_language') || 
                           localStorage.getItem('zuidplas_user_language') || 'nl'; // Default to Dutch
        this.translations = translations;
    }

    /**
     * Get translation for a key
     * Supports placeholders: {0}, {1}, etc.
     */
    t(key, ...args) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return args[0] || key; // First arg is default value if key not found
            }
        }
        
        let result = value || args[0] || key;
        
        // Replace placeholders {0}, {1}, etc. with arguments
        if (typeof result === 'string' && args.length > 0) {
            args.forEach((arg, index) => {
                result = result.replace(`{${index}}`, arg);
            });
        }
        
        return result;
    }

    /**
     * Set language - SAVES TO LOCALSTORAGE FOR ALL PAGES
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            // CRITICAL: Save to localStorage so ALL pages can read it
            localStorage.setItem('zuidplas_language', lang);
            // Also save to user_language for backward compatibility
            localStorage.setItem('zuidplas_user_language', lang);
            this.updatePage();
            return true;
        }
        return false;
    }

    /**
     * Get current language
     */
    getLanguage() {
        return this.currentLang;
    }

    /**
     * Update all text on page
     */
    updatePage() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Update elements with data-i18n-html attribute (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = this.t(key);
        });

        // Update placeholder text
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Trigger custom event for components that need to update
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLang } 
        }));
    }
}

// Global instance
const i18n = new I18n();

// Note: Language initialization is now handled by i18n-init.js
// This ensures proper loading order and consistency across all pages



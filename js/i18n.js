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
            authFailed: 'Auth Failed'
        },
        // Orders
        orders: {
            title: 'Daily Orders',
            syncNow: 'Sync Now',
            lastSynced: 'Last synced:',
            filterBy: 'Filter by:',
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
            noOrders: 'No orders found'
        },
        // Cart Loading
        cartLoading: {
            title: 'Cart Loading Optimizer',
            subtitle: 'Fit all carts on 2 trucks - Cover all 3 routes efficiently',
            optimize: 'Optimize Cart Loading',
            totalCarts: 'Total Carts',
            cartsAssigned: 'Carts Assigned',
            overflow: 'Overflow',
            routesCovered: 'Routes Covered',
            truck1: 'Truck 1',
            truck2: 'Truck 2',
            fits: 'Fits',
            overflow: 'Overflow',
            standard: 'Standard',
            danish: 'Danish',
            cartsByRoute: 'Carts by Route',
            noAllocation: 'No allocation yet',
            needsOrders: 'Please load orders first from Dashboard'
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
            clickToGenerate: 'Click "Run Optimization" to generate scenarios'
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
            dutch: 'Nederlands'
        }
    },
    nl: {
        // Navigation
        nav: {
            dashboard: 'Dashboard',
            orders: 'Bestellingen',
            optimization: 'Optimalisatie',
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
            authFailed: 'Auth Mislukt'
        },
        // Orders
        orders: {
            title: 'Dagelijkse Bestellingen',
            syncNow: 'Nu Synchroniseren',
            lastSynced: 'Laatst gesynchroniseerd:',
            filterBy: 'Filter op:',
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
            noOrders: 'Geen bestellingen gevonden'
        },
        // Cart Loading
        cartLoading: {
            title: 'Wagen Laden Optimalisator',
            subtitle: 'Plaats alle wagens op 2 vrachtwagens - Bedek alle 3 routes efficiënt',
            optimize: 'Optimaliseer Wagen Laden',
            totalCarts: 'Totaal Wagens',
            cartsAssigned: 'Wagens Toegewezen',
            overflow: 'Overloop',
            routesCovered: 'Routes Bedekt',
            truck1: 'Vrachtwagen 1',
            truck2: 'Vrachtwagen 2',
            fits: 'Past',
            overflow: 'Overloop',
            standard: 'Standaard',
            danish: 'Deens',
            cartsByRoute: 'Wagens per Route',
            noAllocation: 'Nog geen toewijzing',
            needsOrders: 'Laad eerst bestellingen van Dashboard'
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
            clickToGenerate: 'Klik "Start Optimalisatie" om scenario\'s te genereren'
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
            dutch: 'Nederlands'
        }
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('zuidplas_language') || 'nl'; // Default to Dutch
        this.translations = translations;
    }

    /**
     * Get translation for a key
     */
    t(key, defaultValue = '') {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return defaultValue || key;
            }
        }
        
        return value || defaultValue || key;
    }

    /**
     * Set language - SAVES TO LOCALSTORAGE FOR ALL PAGES
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            // CRITICAL: Save to localStorage so ALL pages can read it
            localStorage.setItem('zuidplas_language', lang);
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

// Auto-update on load - LOAD LANGUAGE FROM LOCALSTORAGE
document.addEventListener('DOMContentLoaded', () => {
    // Load saved language from localStorage (set by dashboard)
    const savedLang = localStorage.getItem('zuidplas_language') || 'nl';
    i18n.setLanguage(savedLang);
    i18n.updatePage();
});


/**
 * Language Support System
 * Supports English and Dutch
 */
const TRANSLATIONS = {
    en: {
        truck1: 'Truck 1',
        truck2: 'Truck 2',
        neighbor: "Neighbor's Truck",
        external: 'External Truck',
        rijnsburg: 'Rijnsburg',
        aalsmeer: 'Aalsmeer',
        naaldwijk: 'Naaldwijk',
        morning: 'Morning',
        evening: 'Evening',
        selected: 'Selected',
        unavailable: 'Unavailable',
        used_by_route: 'Used by Route',
        select_truck: 'Select Truck',
        view_customer_list: 'View Customer List',
        run_optimization: 'Run Optimization',
        optimize_cart_loading: 'Optimize Cart Loading',
        orders: 'Orders',
        customers: 'Customers',
        carts: 'Carts',
        trucks: 'Trucks',
        carts_needed: 'Carts Needed',
        overflow: 'Overflow',
        fits: 'Fits',
        no_trucks_selected: 'No trucks selected',
        time_conflict_error: 'This truck combination is unavailable due to time conflict with another route',
        dump_basket: 'DUMP BASKET - Unmatched Orders',
        unmatched_customers: 'Unmatched Customers',
        total_unmatched_orders: 'Total Unmatched Orders',
        view_unmatched_list: 'View Unmatched Orders List'
    },
    nl: {
        truck1: 'Vrachtwagen 1',
        truck2: 'Vrachtwagen 2',
        neighbor: 'Buurman\'s Vrachtwagen',
        external: 'Externe Vrachtwagen',
        rijnsburg: 'Rijnsburg',
        aalsmeer: 'Aalsmeer',
        naaldwijk: 'Naaldwijk',
        morning: 'Ochtend',
        evening: 'Avond',
        selected: 'Geselecteerd',
        unavailable: 'Niet beschikbaar',
        used_by_route: 'Gebruikt door Route',
        select_truck: 'Selecteer Vrachtwagen',
        view_customer_list: 'Bekijk Klantenlijst',
        run_optimization: 'Optimalisatie Uitvoeren',
        optimize_cart_loading: 'Karbelading Optimaliseren',
        orders: 'Bestellingen',
        customers: 'Klanten',
        carts: 'Karren',
        trucks: 'Vrachtwagens',
        carts_needed: 'Karren Nodig',
        overflow: 'Overschot',
        fits: 'Past',
        no_trucks_selected: 'Geen vrachtwagens geselecteerd',
        time_conflict_error: 'Deze vrachtwagencombi is niet beschikbaar vanwege tijdsconflict met een andere route',
        dump_basket: 'AFVALBAK - Niet-gematchte Bestellingen',
        unmatched_customers: 'Niet-gematchte Klanten',
        total_unmatched_orders: 'Totaal Niet-gematchte Bestellingen',
        view_unmatched_list: 'Bekijk Niet-gematchte Lijst'
    }
};

let currentLanguage = localStorage.getItem('appLanguage') || 'nl';

function t(key) {
    return (TRANSLATIONS[currentLanguage] && TRANSLATIONS[currentLanguage][key]) || key;
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'nl') {
        console.error('Invalid language:', lang);
        return;
    }
    currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
    console.log(`✅ Language changed to: ${lang === 'en' ? 'English' : 'Dutch'}`);
}

function getCurrentLanguage() {
    return currentLanguage;
}

if (typeof window !== 'undefined') {
    window.Language = {
        t,
        setLanguage,
        getCurrentLanguage
    };
}


/**
 * Zuidplas Logistics - i18n Initialization Script
 * Ensures language is loaded immediately when page loads
 */

(function() {
    'use strict';
    
    // Get saved language (check both keys for compatibility)
    const savedLang = localStorage.getItem('zuidplas_language') || 
                      localStorage.getItem('zuidplas_user_language') || 
                      'nl';
    
    // Set HTML lang attribute immediately
    if (document.documentElement) {
        document.documentElement.lang = savedLang;
    }
    
    // Initialize language when i18n is ready
    function initializeLanguage() {
        if (typeof i18n !== 'undefined' && i18n) {
            console.log('🌐 Initializing language:', savedLang);
            i18n.currentLang = savedLang;
            i18n.setLanguage(savedLang);
        } else {
            // Wait for i18n to load
            setTimeout(initializeLanguage, 100);
        }
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLanguage);
    } else {
        // DOM already loaded
        initializeLanguage();
    }
    
    // Listen for language changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if ((e.key === 'zuidplas_language' || e.key === 'zuidplas_user_language') && typeof i18n !== 'undefined') {
            const newLang = e.newValue || 'nl';
            console.log('🌐 Language changed from storage:', newLang);
            i18n.setLanguage(newLang);
        }
    });
    
    // Listen for custom language change events
    window.addEventListener('languageChanged', (e) => {
        if (typeof i18n !== 'undefined' && e.detail && e.detail.language) {
            console.log('🌐 Language changed via event:', e.detail.language);
            i18n.setLanguage(e.detail.language);
        }
    });
})();

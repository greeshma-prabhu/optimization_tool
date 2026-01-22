/**
 * Zuidplas Logistics - Navigation Helper
 * Manages active navigation link highlighting
 */

(function() {
    'use strict';
    
    /**
     * Mark active navigation link based on current page
     */
    function updateActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPage = link.getAttribute('href');
            
            // Remove active class from all links
            link.classList.remove('active');
            
            // Add active class if this link matches current page
            if (linkPage === currentPage || 
                (currentPage === '' && linkPage === 'index.html')) {
                link.classList.add('active');
            }
        });
    }
    
    // Initialize navigation when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateActiveNavLink);
    } else {
        updateActiveNavLink();
    }
    
    // Re-update when language changes (in case navigation text changes)
    window.addEventListener('languageChanged', () => {
        setTimeout(updateActiveNavLink, 100);
    });
})();

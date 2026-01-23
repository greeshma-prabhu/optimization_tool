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
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        
        // Update top navigation items (new layout)
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.getAttribute('data-page');
            item.classList.remove('active');
            if (page === currentPage || (currentPage === '' && page === 'index')) {
                item.classList.add('active');
            }
        });
        
        // Update old sidebar nav links (for backward compatibility)
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPage = link.getAttribute('href');
            link.classList.remove('active');
            if (linkPage) {
                const linkPageName = linkPage.replace('.html', '').replace('index.html', 'index');
                if (linkPageName === currentPage || (currentPage === '' && linkPageName === 'index')) {
                    link.classList.add('active');
                }
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

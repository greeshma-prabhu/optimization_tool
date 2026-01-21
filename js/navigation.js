/**
 * Zuidplas Logistics - Navigation Handler
 * Manages page navigation, active states, and mobile menu
 */

(function() {
    'use strict';

    // Initialize navigation when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initMobileMenu();
        setActiveNavLink();
    });

    /**
     * Initialize navigation links
     */
    function initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Smooth scroll to top if needed
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /**
     * Initialize mobile menu toggle
     */
    function initMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', function() {
                navLinks.classList.toggle('active');
                
                // Change icon (simple toggle)
                const icon = this.textContent;
                this.textContent = icon === '☰' ? '✕' : '☰';
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!navLinks.contains(e.target) && 
                    !mobileToggle.contains(e.target) && 
                    navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    mobileToggle.textContent = '☰';
                }
            });

            // Close menu when clicking a nav link
            const links = navLinks.querySelectorAll('.nav-link');
            links.forEach(link => {
                link.addEventListener('click', function() {
                    navLinks.classList.remove('active');
                    if (mobileToggle) {
                        mobileToggle.textContent = '☰';
                    }
                });
            });
        }
    }

    /**
     * Set active nav link based on current page
     */
    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || 
                (currentPage === '' && href === 'index.html') ||
                (currentPage === 'index.html' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Smooth scroll to element
     */
    function scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Export functions for global use
    window.Navigation = {
        scrollTo: scrollToElement
    };
})();


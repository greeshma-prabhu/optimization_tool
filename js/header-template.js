/**
 * Shared header and navigation template
 * Matches reference design: https://zuidplas.mainfact.ai
 */

function getHeaderHTML() {
    return `
    <!-- Top Header -->
    <header class="top-header">
        <div class="header-left">
            <div class="header-logo">
                <div class="logo-icon-large">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                </div>
                <div class="logo-text-large">
                    <div class="logo-top-text">GERBERA KWEKERIJ</div>
                    <div class="logo-main-text">Zuidplas Logistics</div>
                </div>
            </div>
        </div>
        <div class="header-right">
            <div class="user-menu" onclick="handleLogout()">
                <div class="user-avatar">A</div>
                <span style="font-size: 14px; color: #374151;">Admin User</span>
                <div class="user-badge">Admin</div>
            </div>
        </div>
    </header>

    <!-- Top Navigation Bar -->
    <nav class="top-nav">
        <div class="nav-items">
            <a href="index.html" class="nav-item" data-page="index">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span data-i18n="nav.dashboard">Dashboard</span>
            </a>
            
            <a href="orders.html" class="nav-item" data-page="orders">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span data-i18n="nav.orders">Orders</span>
            </a>
            
            <a href="optimization.html" class="nav-item" data-page="optimization">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
                </svg>
                <span data-i18n="nav.optimization">Optimization</span>
            </a>
            
            <a href="trucks.html" class="nav-item" data-page="trucks">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span data-i18n="nav.trucks">Trucks</span>
            </a>
            
            <a href="cart-loading.html" class="nav-item" data-page="cart-loading">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                    <line x1="12" y1="12" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="8" y2="16"></line>
                    <line x1="16" y1="12" x2="16" y2="16"></line>
                </svg>
                <span data-i18n="nav.cartOptimization">Cart Optimization</span>
            </a>
            
            <a href="costs.html" class="nav-item" data-page="costs">
                <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span data-i18n="nav.costs">Costs</span>
            </a>
        </div>
    </nav>
    `;
}

// Set active nav item based on current page
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}


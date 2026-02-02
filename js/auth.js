/**
 * Zuidplas Logistics - JWT Token Management
 * Handles authentication and token storage/refresh
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        
        // SMART ROUTING: Auto-detect environment
        const isVercel = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('optimization-tool');
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        if (isVercel) {
            // Vercel deployment: use serverless functions
            this.apiBase = '/api';
            console.log('🔵 AUTH: Vercel mode - using /api');
        } else if (isLocalhost) {
            // Local development: use proxy server
            this.apiBase = 'http://localhost:3001/api';
            console.log('🔧 AUTH: Local mode - using localhost:3001');
        } else {
            // Other deployment: use /api
            this.apiBase = '/api';
            console.log('🌐 AUTH: Production mode - using /api');
        }
        
        this.originalApiBase = 'https://summit.florinet.nl/api/v1';
        this.credentials = {
            username: 'JeroenMainfact',
            password: '&WWpxaM@#'
        };
        
        console.log('🔐 AUTH CONFIG:');
        console.log('   Username:', this.credentials.username);
        console.log('   Password length:', this.credentials.password.length);
        console.log('   Password (masked):', this.credentials.password.substring(0, 2) + '****' + this.credentials.password.substring(this.credentials.password.length - 2));
    }

    /**
     * Load token from localStorage
     */
    loadStoredToken() {
        try {
            const storedToken = localStorage.getItem('florinet_token');
            const storedExpiry = localStorage.getItem('florinet_token_expiry');
            
            if (storedToken && storedExpiry) {
                const expiryTime = parseInt(storedExpiry);
                if (Date.now() < expiryTime) {
                    this.token = storedToken;
                    this.tokenExpiry = expiryTime;
                    return this.token;
                }
            }
        } catch (e) {
            console.error('Error loading stored token:', e);
        }
        return null;
    }

    /**
     * Save token to localStorage
     */
    saveToken(token, expiryTime) {
        try {
            localStorage.setItem('florinet_token', token);
            localStorage.setItem('florinet_token_expiry', expiryTime.toString());
            this.token = token;
            this.tokenExpiry = expiryTime;
        } catch (e) {
            console.error('Error saving token:', e);
        }
    }

    /**
     * Check if token is valid
     */
    isTokenValid() {
        if (!this.token || !this.tokenExpiry) {
            return false;
        }
        // Check if token expires in next 5 minutes (refresh early)
        return Date.now() < (this.tokenExpiry - 5 * 60 * 1000);
    }

    /**
     * Get valid token (refresh if needed) - NO FALLBACK
     */
    async getValidToken() {
        // Try loading from storage first
        const storedToken = this.loadStoredToken();
        if (storedToken && this.isTokenValid()) {
            console.log('✅ Using valid cached token');
            return storedToken;
        }

        // Need to authenticate - throws if fails
        const token = await this.authenticate();
        if (!token) {
            throw new Error('Authentication returned no token');
        }
        return token;
    }

    /**
     * Authenticate with Florinet API - NO FALLBACK
     */
    async authenticate() {
        console.log('=================================');
        console.log('🔐 AUTH MANAGER: Authenticating...');
        console.log('API Base:', this.apiBase);
        console.log('Username:', this.credentials.username);
        console.log('=================================');
        
        try {
            // Use proxy to bypass CORS
            const apiUrl = `${this.apiBase}/authenticate`;
            
            console.log('📤 Sending auth request to:', apiUrl);
            console.log('📤 (Proxied to:', this.originalApiBase + '/authenticate', ')');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: this.credentials.username.trim(),
                    password: this.credentials.password.trim()
                })
            });

            console.log('📥 Auth response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: HTTP ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            // Handle both JWT tokens and session IDs
            const token = data.token || data.sessionId;
            if (!token) {
                throw new Error('No token or session ID received from API: ' + JSON.stringify(data));
            }

            // Token expires in 1 hour (3600000 ms)
            const expiryTime = Date.now() + (50 * 60 * 1000); // 50 minutes for safety
            this.saveToken(token, expiryTime);
            
            // Store auth type for reference
            if (data.type) {
                localStorage.setItem('florinet_auth_type', data.type);
            }

            // Update UI
            this.updateAuthStatus(true);
            
            console.log('✅ AUTH MANAGER: Authentication successful');
            console.log('Token expires in 50 minutes');
            console.log('=================================');
            
            return token;
        } catch (error) {
            console.error('=================================');
            console.error('❌ AUTH MANAGER: Authentication failed');
            console.error('Error:', error);
            console.error('=================================');
            this.updateAuthStatus(false, error.message);
            throw new Error(`Authentication Failed: ${error.message}. Please check credentials and network connection.`);
        }
    }

    /**
     * Clear stored token
     */
    clearToken() {
        localStorage.removeItem('florinet_token');
        localStorage.removeItem('florinet_token_expiry');
        this.token = null;
        this.tokenExpiry = null;
        this.updateAuthStatus(false);
    }

    /**
     * Update authentication status in UI
     */
    updateAuthStatus(authenticated, error = null) {
        const statusElement = document.getElementById('auth-status');
        if (statusElement) {
            if (authenticated) {
                const authType = localStorage.getItem('florinet_auth_type') || 'JWT';
                // Use i18n if available
                if (typeof i18n !== 'undefined') {
                    const authText = i18n.t('dashboard.authenticated', 'Authenticated (JWT)');
                    statusElement.innerHTML = `<span class="status-badge success">${authText}</span>`;
                } else {
                    statusElement.innerHTML = `<span class="status-badge success">Authenticated (${authType})</span>`;
                }
                statusElement.className = 'auth-status success';
            } else {
                // Use i18n if available
                if (typeof i18n !== 'undefined') {
                    const failedText = i18n.t('dashboard.authFailed', 'Auth Failed');
                    const notAuthText = i18n.t('common.notAuthenticated', 'Not Authenticated');
                    statusElement.innerHTML = error 
                        ? `<span class="status-badge danger">${failedText}: ${error}</span>`
                        : `<span class="status-badge warning">${notAuthText}</span>`;
                } else {
                    statusElement.innerHTML = error 
                        ? `<span class="status-badge danger">Auth Failed: ${error}</span>`
                        : '<span class="status-badge warning">Not Authenticated</span>';
                }
                statusElement.className = 'auth-status error';
            }
        }

        // Update last sync time
        const syncTimeElement = document.getElementById('last-sync-time');
        if (syncTimeElement && authenticated) {
            syncTimeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    /**
     * Get token expiry time as readable string
     */
    getTokenExpiryString() {
        if (!this.tokenExpiry) return 'N/A';
        const expiryDate = new Date(this.tokenExpiry);
        return expiryDate.toLocaleString();
    }
}

// Global instance
const authManager = new AuthManager();

// Auto-authenticate on load (silent - doesn't block demo mode)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Try to authenticate, but don't block if it fails (for demo mode)
        const token = await authManager.getValidToken();
        if (token) {
            console.log('✅ Auto-authentication successful');
            authManager.updateAuthStatus(true);
        }
    } catch (error) {
        // Silent failure - don't show error for demo mode
        // Only log if it's not a connection refused (proxy not running)
        if (!error.message.includes('Failed to fetch') && !error.message.includes('CONNECTION_REFUSED')) {
            console.warn('⚠️ Auto-authentication failed (non-critical):', error.message);
        } else {
            console.log('ℹ️ API proxy not running - using demo mode (this is OK)');
        }
        // Show "Demo Mode" instead of "Auth Failed" when proxy isn't available
        authManager.updateAuthStatus(false, null, true); // true = demo mode
    }
});


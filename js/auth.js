/**
 * Zuidplas Logistics - JWT Token Management
 * Handles authentication and token storage/refresh
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        // Use proxy server to bypass CORS
        this.apiBase = 'http://localhost:3001/api';
        this.originalApiBase = 'https://summit.florinet.nl/api/v1';
        this.credentials = {
            username: 'JeroenMainfact',
            password: '&WWpxaM@#'
        };
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
     * Get valid token (refresh if needed)
     */
    async getValidToken() {
        // Try loading from storage first
        const storedToken = this.loadStoredToken();
        if (storedToken && this.isTokenValid()) {
            return storedToken;
        }

        // Need to authenticate
        return await this.authenticate();
    }

    /**
     * Authenticate with Florinet API
     */
    async authenticate() {
        try {
            const response = await fetch(`${this.apiBase}/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.credentials)
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle both JWT tokens and session IDs
            const token = data.token || data.sessionId;
            if (!token) {
                throw new Error('No token or session ID received from API');
            }

            // Token expires in 1 hour (3600000 ms)
            // Session-based auth might have different expiry, but we'll use 1 hour as default
            const expiryTime = Date.now() + (60 * 60 * 1000);
            this.saveToken(token, expiryTime);
            
            // Store auth type for reference
            if (data.type) {
                localStorage.setItem('florinet_auth_type', data.type);
            }

            // Update UI
            this.updateAuthStatus(true);
            
            return token;
        } catch (error) {
            console.error('Authentication error:', error);
            this.updateAuthStatus(false, error.message);
            throw error;
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
                statusElement.innerHTML = `<span class="status-badge success">Authenticated (${authType})</span>`;
                statusElement.className = 'auth-status success';
            } else {
                statusElement.innerHTML = error 
                    ? `<span class="status-badge danger">Auth Failed: ${error}</span>`
                    : '<span class="status-badge warning">Not Authenticated</span>';
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

// Auto-authenticate on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = await authManager.getValidToken();
        if (token) {
            console.log('✅ Auto-authentication successful');
            authManager.updateAuthStatus(true);
        }
    } catch (error) {
        console.error('Auto-authentication failed:', error);
        authManager.updateAuthStatus(false, error.message);
    }
});


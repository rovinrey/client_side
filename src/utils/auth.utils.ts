/**
 * Authentication utilities for consistent user ID and token extraction
 * Works seamlessly for both local development and production
 */

/**
 * Safely extract user ID from localStorage with proper fallbacks
 * @returns user_id as number or null if not found
 */
export const getUserId = (): number | null => {
    // Primary source: user_id directly
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const parsed = Number(userId);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }

    // Fallback: extract from stored user object
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const id = user?.id || user?.user_id;
            if (id) {
                const parsed = Number(id);
                if (!isNaN(parsed) && parsed > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to parse user object:', e);
        }
    }

    return null;
};

/**
 * Get authentication token from localStorage
 * @returns JWT token or null if not found
 */
export const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

/**
 * Get authorization headers object for API requests
 * @returns object with Authorization header or empty object
 */
export const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Validate user session (has both user_id and token)
 * @returns true if user is authenticated, false otherwise
 */
export const isUserAuthenticated = (): boolean => {
    return !!getUserId() && !!getAuthToken();
};

/**
 * Handle session expiration / unauthorized response
 * Shows alert and optionally redirects to login
 */
export const handleSessionExpired = (message = 'Session expired. Please log in again.') => {
    alert(message);
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

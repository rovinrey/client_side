/**
 * Authentication utilities for consistent user ID and token extraction
 * Works seamlessly for both local development and production
 */
import { storageGet, storageRemove } from './storage';

/**
 * Get authentication token from sessionStorage (via abstraction layer)
 * @returns JWT token or null if not found
 */
export const getAuthToken = (): string | null => {
    return storageGet('token');
};

/**
 * Safely extract user ID from storage with proper fallbacks
 * @returns user_id as number or null if not found
 */
export const getUserId = (): number | null => {
    // Fallback Helper to parse and validate
    const validateId = (id: unknown): number | null => {
        const parsed = Number(id);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
        return null;
    };

    // 1. Primary source: user_id directly
    const userId = storageGet('user_id');
    if (userId) {
        const validated = validateId(userId);
        if (validated) return validated;
    }

    // 2. Secondary source: extract from stored user object
    const userJson = storageGet('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const validated = validateId(user?.id || user?.user_id);
            if (validated) return validated;
        } catch (e) {
            console.warn('Failed to parse user object:', e);
        }
    }

    // 3. Last resort fallback: Extract from the JWT token directly
    const token = getAuthToken();
    if (token) {
        try {
            // Decode the payload of the JWT
            const base64Payload = token.split('.')[1];
            const payload = JSON.parse(atob(base64Payload));
            const validated = validateId(payload?.id || payload?.user_id);
            if (validated) return validated;
        } catch (e) {
            console.warn('Failed to decode user_id from token payload:', e);
        }
    }

    return null;
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
 * Validate user session (checks token format and expiration)
 * @returns true if user is authenticated and token is valid, false otherwise
 */
export const isUserAuthenticated = (): boolean => {
    const token = getAuthToken();
    const userId = getUserId();
    
    if (!token || !userId) return false;

    try {
        // Decode to verify expiration
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
            // Silence-cleans token if expired on route check
            storageRemove('token');
            storageRemove('user_id');
            storageRemove('user');
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Handle session expiration / unauthorized response
 * Shows alert and optionally redirects to login
 */
export const handleSessionExpired = (message = 'Session expired. Please log in again.') => {
    alert(message);
    storageRemove('token');
    storageRemove('user_id');
    storageRemove('user');
    storageRemove('role');
    
    // Redirect to login using a safe replacement
    window.location.replace('/login');
};

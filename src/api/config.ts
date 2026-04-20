/**
 * Centralized API base URL configuration
 *
 * Production (Vercel): Uses VITE_API_URL environment variable (must be HTTPS)
 * Development: Uses local backend on port 8080
 *
 * IMPORTANT: Always use HTTPS in production to avoid Mixed Content blocking
 */

const defaultApiUrl = import.meta.env.PROD
    ? "https://serverside-production-9b74.up.railway.app" // Production with HTTPS
    : "http://localhost:8080"; // Development

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || defaultApiUrl;

// Validate HTTPS in production
if (import.meta.env.PROD && !API_BASE_URL.startsWith('https://')) {
    console.warn('⚠️  WARNING: Production API URL should use HTTPS to avoid Mixed Content errors');
}

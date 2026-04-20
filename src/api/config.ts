/**
 * Centralized API configuration
 * Uses environment variables to determine backend URL
 */

const getDefaultApiUrl = () => {
  if (import.meta.env.PROD) {
    const url = import.meta.env.VITE_API_URL;
    if (!url) {
      console.error('⚠️  VITE_API_URL not set for production build');
    }
    return url || '';
  }
  return 'http://localhost:8080';
};

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || getDefaultApiUrl();

// Validate HTTPS in production
if (import.meta.env.PROD && API_BASE_URL && !API_BASE_URL.startsWith('https://')) {
  console.warn('⚠️  Production API URL should use HTTPS to avoid Mixed Content errors');
}

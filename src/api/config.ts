/**
 * Centralized API base URL — reads from VITE_API_URL env variable.
 * Every file that calls the backend must import this instead of hardcoding URLs.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // No trailing /api

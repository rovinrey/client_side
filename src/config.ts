const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  environment: import.meta.env.VITE_ENV || 'development',
  isDevelopment: import.meta.env.VITE_ENV === 'development',
  isProduction: import.meta.env.VITE_ENV === 'production',
} as const;

export default config;


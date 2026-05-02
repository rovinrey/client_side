import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // This will automatically open the browser when you run npm run dev
    host: true, // Listen on all network interfaces (optional, for external access)
    port: 5173, // Default Vite port
  },
})

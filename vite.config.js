import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Forwards /api and /sanctum calls to the Laravel backend during dev
      // so the browser sees everything as same-origin (needed for Sanctum's
      // cookie-based SPA auth to work without extra CORS gymnastics).
      '/api': {
        target: 'http://guroassist.test',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://guroassist.test',
        changeOrigin: true,
      },
    },
  },
})

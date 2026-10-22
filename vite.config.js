import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Forwards /api and /sanctum calls to the Laravel backend during dev
      // so the browser sees everything as same-origin (needed for Sanctum's
      // cookie-based SPA auth to work without extra CORS gymnastics).
      '/api': {
        target: 'http://192.168.10.10',
        changeOrigin: true,
        headers: { host: 'guroassist.test' },
      },
      '/sanctum': {
        target: 'http://192.168.10.10',
        changeOrigin: true,
        headers: { host: 'guroassist.test' },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/dev': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    exclude: ['tests/**', 'playwright/**', 'e2e/**', 'dist/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 2,
        statements: 2,
        functions: 2,
        branches: 0,
      },
    },
  },
})

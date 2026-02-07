/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: process.env.VITE_DISABLE_HTTPS === 'true'
      ? undefined
      : (process.env.VITE_CERT_PATH && process.env.VITE_KEY_PATH
        ? {
            cert: fs.readFileSync(process.env.VITE_CERT_PATH, 'utf-8'),
            key: fs.readFileSync(process.env.VITE_KEY_PATH, 'utf-8'),
          }
        : undefined),
    host: process.env.VITE_DEV_HOST || 'localhost',
    hmr: process.env.VITE_DEV_HOST || process.env.VITE_DEV_PORT
      ? {
          host: process.env.VITE_DEV_HOST || 'localhost',
          clientPort: process.env.VITE_DEV_PORT
            ? Number(process.env.VITE_DEV_PORT)
            : undefined,
          protocol: process.env.VITE_DISABLE_HTTPS === 'true' ? 'ws' : 'wss',
        }
      : undefined,
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
  // @ts-ignore Vitest config is supported by Vite
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

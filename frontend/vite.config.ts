/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: process.env.VITE_CERT_PATH && process.env.VITE_KEY_PATH
      ? {
          cert: fs.readFileSync(process.env.VITE_CERT_PATH, 'utf-8'),
          key: fs.readFileSync(process.env.VITE_KEY_PATH, 'utf-8'),
        }
      : undefined,
    host: 'localhost', // Explicitly use localhost
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

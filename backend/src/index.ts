/**
 * Inspire Backend - Main Entry Point
 * 
 * This is the main entry point for the Inspire backend services.
 * It exports all service factories and utilities for external API integration.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Export all services and types
export * from './services';

// Export example usage
export { main as runExample } from './example';

// Log initialization
if (process.env.LOG_API_REQUESTS === 'true') {
  console.log('[Inspire Backend] Initialized with environment configuration');
  console.log('[Inspire Backend] Mock fallback:', process.env.USE_MOCK_FALLBACK === 'true' ? 'Enabled' : 'Disabled');
}

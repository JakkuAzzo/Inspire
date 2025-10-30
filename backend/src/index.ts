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
import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateFuelPack } from './fuelPackGenerator';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Inspire API is running' });
});

app.get('/api/fuel-pack', (req: Request, res: Response) => {
  try {
    const fuelPack = generateFuelPack();
    res.json(fuelPack);
  } catch (error) {
    console.error('Error generating fuel pack:', error);
    res.status(500).json({ error: 'Failed to generate fuel pack' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Inspire API running on http://localhost:${PORT}`);
});

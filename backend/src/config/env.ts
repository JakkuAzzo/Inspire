import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentValidation {
  missing: string[];
  warnings: string[];
  isProductionReady: boolean;
}

const REQUIRED_KEYS = [
  'FREESOUND_API_KEY',
  'JAMENDO_CLIENT_ID',
  'NEWS_API_KEY',
  'IMGFLIP_USERNAME',
  'IMGFLIP_PASSWORD',
  'UNSPLASH_ACCESS_KEY',
  'PIPED_API_URL'
];

export function validateEnvironment(): EnvironmentValidation {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  const warnings: string[] = [];
  if (!process.env.HUGGINGFACE_API_KEY) warnings.push('HUGGINGFACE_API_KEY missing; mood detection will be mocked.');

  const isProductionReady = missing.length === 0;
  return { missing, warnings, isProductionReady };
}

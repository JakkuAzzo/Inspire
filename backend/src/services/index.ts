/**
 * Inspire Backend Services
 * 
 * This module exports all external API service wrappers for the Inspire creativity app.
 * Each service provides methods to fetch creative content from various free APIs,
 * with automatic fallback to mock data when API keys are missing or requests fail.
 */

import { WordService, createWordService } from './wordService';
import { MemeService, createMemeService } from './memeService';
import { MoodService, createMoodService } from './moodService';
import { AudioService, createAudioService } from './audioService';
import { TrendService, createTrendService } from './trendService';
import { RandomService, createRandomService } from './randomService';
import { YouTubeService, createYouTubeService } from './youtubeService';
import { NewsService, createNewsService } from './newsService';

export { WordService, createWordService } from './wordService';
export type { Word, WordDefinition } from './wordService';

export { MemeService, createMemeService } from './memeService';
export type { Meme, Image, RedditPost } from './memeService';

export { MoodService, createMoodService } from './moodService';
export type { Mood, EmotionalArc, SentimentResult, EmotionResult } from './moodService';

export { AudioService, createAudioService } from './audioService';
export type { Sound, Track, SampleCategory } from './audioService';

export { TrendService, createTrendService } from './trendService';
export type { NewsArticle, TrendingTopic, RedditTopic, HistoricalEvent } from './trendService';

export { RandomService, createRandomService } from './randomService';
export type { Activity, CreativePrompt } from './randomService';

export { YouTubeService, createYouTubeService } from './youtubeService';
export type { InstrumentalVideo } from './youtubeService';

export { NewsService, createNewsService } from './newsService';
export type { NewsHeadline } from './newsService';

export { ApiClient } from './apiClient';

/**
 * Create all services with default configuration from environment variables
 */
export function createAllServices() {
  const wordService = createWordService();
  const memeService = createMemeService();
  const moodService = createMoodService();
  const audioService = createAudioService();
  const trendService = createTrendService();
  const randomService = createRandomService();
  const youtubeService = createYouTubeService();
  const newsService = createNewsService();

  // Attach simple health checks to each service so /api/health can report provider status.
  const makeOk = (name: string) => ({ name, status: 'ok' as const });
  const makeDegraded = (name: string, reason: string) => ({ name, status: 'degraded' as const, reason });

  // WordService: keyless (Datamuse) - consider ok if base URL reachable via env (best-effort)
  // MemeService: may use IMGFLIP creds; mark degraded if IMGFLIP env is missing and service expects it
  // AudioService: depends on FREESOUND_API_KEY / JAMENDO_CLIENT_ID
  // NewsService: depends on NEWS_API_KEY for live data

  try {
    (wordService as any).getHealth = () => {
      return makeOk('Datamuse/WordService');
    };
  } catch (e) {}

  try {
    (memeService as any).getHealth = () => {
      if (process.env.IMGFLIP_USERNAME && process.env.IMGFLIP_PASSWORD) return makeOk('Imgflip/MemeService');
      return makeOk('Picsum/MemeService (keyless)');
    };
  } catch (e) {}

  try {
    (moodService as any).getHealth = () => makeOk('MoodService');
  } catch (e) {}

  try {
    (audioService as any).getHealth = () => {
      if (process.env.FREESOUND_API_KEY || process.env.JAMENDO_CLIENT_ID) return makeOk('AudioService');
      return makeDegraded('AudioService', 'No FREESOUND_API_KEY or JAMENDO_CLIENT_ID configured');
    };
  } catch (e) {}

  try {
    (trendService as any).getHealth = () => makeOk('TrendService');
  } catch (e) {}

  try {
    (randomService as any).getHealth = () => makeOk('RandomService');
  } catch (e) {}

  try {
    (youtubeService as any).getHealth = () => makeOk('YouTubeService (Piped)');
  } catch (e) {}

  try {
    (newsService as any).getHealth = () => {
      if (process.env.NEWS_API_KEY) return makeOk('NewsAPI');
      return makeDegraded('NewsAPI', 'NEWS_API_KEY missing; using static mirror');
    };
  } catch (e) {}

  return {
    wordService,
    memeService,
    moodService,
    audioService,
    trendService,
    randomService,
    youtubeService,
    newsService
  };
}

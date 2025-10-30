/**
 * Inspire Backend Services
 * 
 * This module exports all external API service wrappers for the Inspire creativity app.
 * Each service provides methods to fetch creative content from various free APIs,
 * with automatic fallback to mock data when API keys are missing or requests fail.
 */

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

export { ApiClient } from './apiClient';

/**
 * Create all services with default configuration from environment variables
 */
export function createAllServices() {
  return {
    wordService: createWordService(),
    memeService: createMemeService(),
    moodService: createMoodService(),
    audioService: createAudioService(),
    trendService: createTrendService(),
    randomService: createRandomService()
  };
}

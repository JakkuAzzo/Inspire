import { ApiClient, defaultApiKeyManager } from './apiClient';
import { LruCache } from '../utils/cache';
import { mockSounds, mockTracks, mockSampleCategories } from '../mocks/audioMocks';

export interface AudioServiceConfig {
  freesoundUrl: string;
  freesoundApiKey?: string;
  jamendoUrl: string;
  jamendoClientId?: string;
  useMockFallback: boolean;
}

export interface Sound {
  id: number;
  name: string;
  tags: string[];
  description: string;
  duration: number;
  previews?: {
    'preview-hq-mp3'?: string;
    'preview-lq-mp3'?: string;
  };
  bpm?: number;
  type: string;
}

export interface Track {
  id: string;
  name: string;
  artist_name: string;
  duration: number;
  audiodownload?: string;
  audio?: string;
  bpm?: number;
  tags?: string[];
}

export interface SampleCategory {
  name: string;
  count: number;
  tags: string[];
}

export class AudioService {
  private freesoundClient: ApiClient | null;
  private jamendoClient: ApiClient | null;
  private config: AudioServiceConfig;
  private cache = new LruCache<string, Sound[]>(50);

  constructor(config: AudioServiceConfig) {
    this.config = config;
    
    this.freesoundClient = config.freesoundApiKey
      ? new ApiClient({
          baseURL: config.freesoundUrl,
          apiKeyManager: defaultApiKeyManager,
          apiKeyName: 'FREESOUND_API_KEY',
          headers: {
            'Authorization': `Token ${config.freesoundApiKey}`
          }
        })
      : null;

    this.jamendoClient = config.jamendoClientId
      ? new ApiClient({ baseURL: config.jamendoUrl, apiKeyManager: defaultApiKeyManager, apiKeyName: 'JAMENDO_CLIENT_ID' })
      : null;
  }

  /**
   * Search for audio samples on Freesound
   * @param query Search query (e.g., 'drum', 'bass', 'synth')
   * @param pageSize Number of results (default: 10)
   */
  async searchSounds(query: string, pageSize: number = 10): Promise<Sound[]> {
    const cacheKey = `search:${query}:${pageSize}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.freesoundClient) {
      console.warn('[AudioService] Freesound API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockSoundsByQuery(query, pageSize);
      }
      return [];
    }

    try {
      const response = await this.freesoundClient.get<{ results: Sound[] }>('/search/text/', {
        query,
        page_size: pageSize,
        fields: 'id,name,tags,description,duration,previews,type'
      });
      this.cache.set(cacheKey, response.results, 60 * 1000);
      return response.results;
    } catch (error) {
      console.warn('[AudioService] Failed to search sounds, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockSoundsByQuery(query, pageSize);
      }
      throw error;
    }
  }

  /**
   * Get random sounds from Freesound
   * @param count Number of sounds to retrieve (default: 5)
   */
  async getRandomSounds(count: number = 5): Promise<Sound[]> {
    if (!this.freesoundClient) {
      console.warn('[AudioService] Freesound API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockSounds(count);
      }
      return [];
    }

    try {
      // Freesound doesn't have a direct random endpoint, so we search with random terms
      const randomQueries = ['drum', 'bass', 'synth', 'vocal', 'fx'];
      const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)];
      
      const response = await this.freesoundClient.get<{ results: Sound[] }>('/search/text/', {
        query: randomQuery,
        page_size: count,
        fields: 'id,name,tags,description,duration,previews,type',
        sort: 'random'
      });
      return response.results;
    } catch (error) {
      console.warn('[AudioService] Failed to get random sounds, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockSounds(count);
      }
      throw error;
    }
  }

  /**
   * Get sound details by ID
   * @param soundId Freesound sound ID
   */
  async getSoundById(soundId: number): Promise<Sound | null> {
    if (!this.freesoundClient) {
      console.warn('[AudioService] Freesound API key not configured');
      return null;
    }

    try {
      const sound = await this.freesoundClient.get<Sound>(`/sounds/${soundId}/`);
      return sound;
    } catch (error) {
      console.warn('[AudioService] Failed to get sound by ID');
      throw error;
    }
  }

  /**
   * Search for music tracks on Jamendo
   * @param query Search query
   * @param limit Number of results (default: 10)
   */
  async searchTracks(query: string, limit: number = 10): Promise<Track[]> {
    if (!this.jamendoClient) {
      console.warn('[AudioService] Jamendo client ID not configured, using mock data');
      if (this.config.useMockFallback) {
        return mockTracks.slice(0, limit);
      }
      return [];
    }

    try {
      const response = await this.jamendoClient.get<{ results: Track[] }>('/tracks/', {
        client_id: this.config.jamendoClientId,
        search: query,
        limit,
        audioformat: 'mp32'
      });
      return response.results;
    } catch (error) {
      console.warn('[AudioService] Failed to search tracks, using mock data');
      if (this.config.useMockFallback) {
        return mockTracks.slice(0, limit);
      }
      throw error;
    }
  }

  /**
   * Get tracks by genre/mood
   * @param tags Array of tags (e.g., ['hip-hop', 'chill'])
   * @param limit Number of results (default: 10)
   */
  async getTracksByTags(tags: string[], limit: number = 10): Promise<Track[]> {
    if (!this.jamendoClient) {
      console.warn('[AudioService] Jamendo client ID not configured, using mock data');
      if (this.config.useMockFallback) {
        return mockTracks.slice(0, limit);
      }
      return [];
    }

    try {
      const response = await this.jamendoClient.get<{ results: Track[] }>('/tracks/', {
        client_id: this.config.jamendoClientId,
        tags: tags.join(','),
        limit,
        audioformat: 'mp32'
      });
      return response.results;
    } catch (error) {
      console.warn('[AudioService] Failed to get tracks by tags, using mock data');
      if (this.config.useMockFallback) {
        return mockTracks.slice(0, limit);
      }
      throw error;
    }
  }

  /**
   * Get available sample categories
   */
  async getSampleCategories(): Promise<SampleCategory[]> {
    return mockSampleCategories;
  }

  /**
   * Get sounds by category
   * @param category Category name (e.g., 'Drums', 'Bass')
   * @param limit Number of results (default: 10)
   */
  async getSoundsByCategory(category: string, limit: number = 10): Promise<Sound[]> {
    const categoryData = mockSampleCategories.find(
      cat => cat.name.toLowerCase() === category.toLowerCase()
    );

    if (categoryData && categoryData.tags.length > 0) {
      const randomTag = categoryData.tags[Math.floor(Math.random() * categoryData.tags.length)];
      return this.searchSounds(randomTag, limit);
    }

    return this.searchSounds(category, limit);
  }

  // Mock data helpers
  private getMockSoundsByQuery(query: string, limit: number): Sound[] {
    const filtered = mockSounds.filter(sound =>
      sound.name.toLowerCase().includes(query.toLowerCase()) ||
      sound.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filtered.length > 0) {
      return filtered.slice(0, limit);
    }
    
    return mockSounds.slice(0, limit);
  }

  private getRandomMockSounds(count: number): Sound[] {
    const shuffled = [...mockSounds].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getHealth() {
    return {
      name: 'audio',
      status: this.freesoundClient || this.jamendoClient ? 'ok' : 'degraded',
      cache: this.cache.metrics(),
      usingKeys: {
        freesound: Boolean(this.config.freesoundApiKey),
        jamendo: Boolean(this.config.jamendoClientId)
      }
    };
  }
}

// Factory function to create AudioService with environment variables
export function createAudioService(): AudioService {
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  return new AudioService({
    freesoundUrl: process.env.FREESOUND_API_URL || 'https://freesound.org/apiv2',
    freesoundApiKey: process.env.FREESOUND_API_KEY,
    jamendoUrl: process.env.JAMENDO_API_URL || 'https://api.jamendo.com/v3.0',
    jamendoClientId: process.env.JAMENDO_CLIENT_ID,
    useMockFallback
  });
}

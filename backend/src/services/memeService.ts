import { ApiClient } from './apiClient';
import { mockMemes, mockImages, mockRedditPosts } from '../mocks/memeMocks';

export interface MemeServiceConfig {
  imgflipUrl: string;
  unsplashUrl: string;
  unsplashAccessKey?: string;
  redditUrl: string;
  useMockFallback: boolean;
}

export interface Meme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count?: number;
}

export interface Image {
  id: string;
  description: string;
  urls: {
    regular: string;
    small: string;
  };
  user: {
    name: string;
    username: string;
  };
  alt_description?: string;
}

export interface RedditPost {
  title: string;
  url: string;
  author: string;
  score: number;
  subreddit: string;
  created: number;
  permalink: string;
}

export class MemeService {
  private imgflipClient: ApiClient;
  private unsplashClient: ApiClient | null;
  private redditClient: ApiClient;
  private config: MemeServiceConfig;

  constructor(config: MemeServiceConfig) {
    this.config = config;
    this.imgflipClient = new ApiClient({ baseURL: config.imgflipUrl });
    
    this.unsplashClient = config.unsplashAccessKey
      ? new ApiClient({
          baseURL: config.unsplashUrl,
          headers: {
            'Authorization': `Client-ID ${config.unsplashAccessKey}`
          }
        })
      : null;
    
    this.redditClient = new ApiClient({ baseURL: config.redditUrl });
  }

  /**
   * Get popular meme templates
   */
  async getMemes(): Promise<Meme[]> {
    try {
      const response = await this.imgflipClient.get<{ success: boolean; data: { memes: Meme[] } }>('/get_memes');
      return response.data.memes;
    } catch (error) {
      console.warn('[MemeService] Failed to fetch memes, using mock data');
      if (this.config.useMockFallback) {
        return mockMemes;
      }
      throw error;
    }
  }

  /**
   * Get random inspirational image
   * @param query Search query for images (e.g., 'music', 'energy')
   */
  async getRandomImage(query: string = 'music'): Promise<Image | null> {
    if (!this.unsplashClient) {
      console.warn('[MemeService] Unsplash API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockImage();
      }
      return null;
    }

    try {
      const image = await this.unsplashClient.get<Image>('/photos/random', {
        query,
        orientation: 'landscape'
      });
      return image;
    } catch (error) {
      console.warn('[MemeService] Failed to fetch random image, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockImage();
      }
      throw error;
    }
  }

  /**
   * Search images by keyword
   * @param query Search query
   * @param perPage Number of results per page (default: 10)
   */
  async searchImages(query: string, perPage: number = 10): Promise<Image[]> {
    if (!this.unsplashClient) {
      console.warn('[MemeService] Unsplash API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return mockImages.slice(0, perPage);
      }
      return [];
    }

    try {
      const response = await this.unsplashClient.get<{ results: Image[] }>('/search/photos', {
        query,
        per_page: perPage
      });
      return response.results;
    } catch (error) {
      console.warn('[MemeService] Failed to search images, using mock data');
      if (this.config.useMockFallback) {
        return mockImages.slice(0, perPage);
      }
      throw error;
    }
  }

  /**
   * Get memes from a subreddit
   * @param subreddit Name of the subreddit (default: 'memes')
   * @param sort Sort type: 'hot', 'top', 'new' (default: 'hot')
   * @param limit Number of posts to retrieve (default: 10)
   */
  async getSubredditMemes(
    subreddit: string = 'memes',
    sort: 'hot' | 'top' | 'new' = 'hot',
    limit: number = 10
  ): Promise<RedditPost[]> {
    try {
      const response = await this.redditClient.get<{
        data: {
          children: Array<{ data: RedditPost }>;
        };
      }>(`/r/${subreddit}/${sort}.json`, { limit });

      return response.data.children.map(child => child.data);
    } catch (error) {
      console.warn('[MemeService] Failed to fetch subreddit memes, using mock data');
      if (this.config.useMockFallback) {
        return mockRedditPosts.slice(0, limit);
      }
      throw error;
    }
  }

  /**
   * Get motivational posts from r/GetMotivated
   * @param limit Number of posts (default: 5)
   */
  async getMotivationalPosts(limit: number = 5): Promise<RedditPost[]> {
    return this.getSubredditMemes('GetMotivated', 'top', limit);
  }

  // Mock data helper
  private getRandomMockImage(): Image {
    return mockImages[Math.floor(Math.random() * mockImages.length)];
  }
}

// Factory function to create MemeService with environment variables
export function createMemeService(): MemeService {
  return new MemeService({
    imgflipUrl: process.env.IMGFLIP_API_URL || 'https://api.imgflip.com',
    unsplashUrl: process.env.UNSPLASH_API_URL || 'https://api.unsplash.com',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
    redditUrl: process.env.REDDIT_API_URL || 'https://www.reddit.com',
    useMockFallback: process.env.USE_MOCK_FALLBACK === 'true'
  });
}

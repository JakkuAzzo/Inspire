import { ApiClient } from './apiClient';
import { mockActivities, mockRandomIdeas, mockCreativePrompts, mockWildcards } from '../mocks/randomMocks';

export interface RandomServiceConfig {
  boredApiUrl: string;
  randomDataApiUrl: string;
  useMockFallback: boolean;
}

export interface Activity {
  activity: string;
  type: string;
  participants: number;
  accessibility: number;
  key: string;
}

export interface CreativePrompt {
  type: 'lyrical' | 'production' | 'conceptual' | 'collaboration' | 'technical';
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export class RandomService {
  private boredApiClient: ApiClient;
  private randomDataClient: ApiClient;
  private config: RandomServiceConfig;

  constructor(config: RandomServiceConfig) {
    this.config = config;
    this.boredApiClient = new ApiClient({ baseURL: config.boredApiUrl });
    this.randomDataClient = new ApiClient({ baseURL: config.randomDataApiUrl });
  }

  /**
   * Get random activity suggestion
   * @param type Optional activity type filter
   */
  async getRandomActivity(type?: string): Promise<Activity> {
    try {
      const params = type ? { type } : {};
      const activity = await this.boredApiClient.get<Activity>('/activity', params);
      return activity;
    } catch (error) {
      console.warn('[RandomService] Failed to fetch activity, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockActivity(type);
      }
      throw error;
    }
  }

  /**
   * Get multiple random activities
   * @param count Number of activities (default: 3)
   */
  async getRandomActivities(count: number = 3): Promise<Activity[]> {
    const activities: Activity[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const activity = await this.getRandomActivity();
        activities.push(activity);
      } catch (error) {
        if (this.config.useMockFallback) {
          activities.push(this.getRandomMockActivity());
        }
      }
    }
    
    return activities;
  }

  /**
   * Get random creative idea
   */
  async getRandomIdea(): Promise<string> {
    return mockRandomIdeas[Math.floor(Math.random() * mockRandomIdeas.length)];
  }

  /**
   * Get multiple random ideas
   * @param count Number of ideas (default: 5)
   */
  async getRandomIdeas(count: number = 5): Promise<string[]> {
    const shuffled = [...mockRandomIdeas].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get random creative prompt
   * @param type Optional prompt type filter
   */
  async getRandomPrompt(type?: CreativePrompt['type']): Promise<CreativePrompt> {
    let prompts = mockCreativePrompts;
    
    if (type) {
      prompts = prompts.filter(p => p.type === type);
    }
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  /**
   * Get multiple creative prompts
   * @param count Number of prompts (default: 3)
   * @param difficulty Optional difficulty filter
   */
  async getCreativePrompts(
    count: number = 3,
    difficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<CreativePrompt[]> {
    let prompts = [...mockCreativePrompts];
    
    if (difficulty) {
      prompts = prompts.filter(p => p.difficulty === difficulty);
    }
    
    const shuffled = prompts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get random wildcard element for unexpected twists
   */
  async getWildcard(): Promise<string> {
    return mockWildcards[Math.floor(Math.random() * mockWildcards.length)];
  }

  /**
   * Get multiple wildcards
   * @param count Number of wildcards (default: 2)
   */
  async getWildcards(count: number = 2): Promise<string[]> {
    const shuffled = [...mockWildcards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Generate a complete random fuel pack
   * @param includeWildcards Whether to include wildcard elements
   */
  async generateFuelPack(includeWildcards: boolean = true): Promise<{
    ideas: string[];
    prompts: CreativePrompt[];
    activity: Activity;
    wildcards?: string[];
  }> {
    const [ideas, prompts, activity] = await Promise.all([
      this.getRandomIdeas(3),
      this.getCreativePrompts(2),
      this.getRandomActivity('creative')
    ]);

    const pack: any = {
      ideas,
      prompts,
      activity
    };

    if (includeWildcards) {
      pack.wildcards = await this.getWildcards(2);
    }

    return pack;
  }

  /**
   * Get random data for creative personas/characters
   * This uses the Random Data API for generating random user personas
   */
  async getRandomPersona(): Promise<any> {
    try {
      const persona = await this.randomDataClient.get<any>('/v2/users', { size: 1 });
      return persona;
    } catch (error) {
      console.warn('[RandomService] Failed to fetch random persona, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockPersona();
      }
      throw error;
    }
  }

  /**
   * Combine ideas from multiple categories
   */
  async getMashupIdea(): Promise<{
    idea1: string;
    idea2: string;
    wildcard: string;
    combination: string;
  }> {
    const [idea1, idea2] = await this.getRandomIdeas(2);
    const wildcard = await this.getWildcard();
    
    return {
      idea1,
      idea2,
      wildcard,
      combination: `${idea1} + ${idea2} with ${wildcard}`
    };
  }

  // Mock data helpers
  private getRandomMockActivity(type?: string): Activity {
    let activities = mockActivities;
    
    if (type) {
      activities = activities.filter(a => a.type === type);
    }
    
    if (activities.length === 0) {
      activities = mockActivities;
    }
    
    return activities[Math.floor(Math.random() * activities.length)];
  }

  private getMockPersona(): any {
    return {
      id: Math.floor(Math.random() * 10000),
      first_name: 'Creative',
      last_name: 'Artist',
      username: 'creative_persona_' + Math.floor(Math.random() * 1000),
      email: 'persona@inspire.app'
    };
  }
}

// Factory function to create RandomService with environment variables
export function createRandomService(): RandomService {
  return new RandomService({
    boredApiUrl: process.env.BORED_API_URL || 'https://www.boredapi.com/api',
    randomDataApiUrl: process.env.RANDOM_DATA_API_URL || 'https://random-data-api.com/api',
    useMockFallback: process.env.USE_MOCK_FALLBACK === 'true'
  });
}

import { ApiClient } from './apiClient';
import { mockMoods, mockEmotions, mockEmotionalArcs, mockSentimentAnalysis } from '../mocks/moodMocks';

export interface MoodServiceConfig {
  huggingFaceUrl: string;
  huggingFaceApiKey?: string;
  emotionModel: string;
  useMockFallback: boolean;
}

export interface Mood {
  name: string;
  tags: string[];
  intensity: number;
}

export interface EmotionalArc {
  start: string;
  middle: string;
  end: string;
}

export interface SentimentResult {
  label: string;
  score: number;
}

export interface EmotionResult {
  label: string;
  score: number;
}

export class MoodService {
  private huggingFaceClient: ApiClient | null;
  private config: MoodServiceConfig;

  constructor(config: MoodServiceConfig) {
    this.config = config;
    
    this.huggingFaceClient = config.huggingFaceApiKey
      ? new ApiClient({
          baseURL: config.huggingFaceUrl,
          apiKey: config.huggingFaceApiKey
        })
      : null;
  }

  /**
   * Get random mood tags for inspiration
   * @param count Number of moods to return (default: 3)
   */
  async getRandomMoods(count: number = 3): Promise<Mood[]> {
    const shuffled = [...mockMoods].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get mood by intensity level
   * @param minIntensity Minimum intensity (1-10)
   * @param maxIntensity Maximum intensity (1-10)
   */
  async getMoodsByIntensity(minIntensity: number = 1, maxIntensity: number = 10): Promise<Mood[]> {
    return mockMoods.filter(mood => 
      mood.intensity >= minIntensity && mood.intensity <= maxIntensity
    );
  }

  /**
   * Get random emotional arc for storytelling
   */
  async getRandomEmotionalArc(): Promise<EmotionalArc> {
    const arcs = mockEmotionalArcs;
    return arcs[Math.floor(Math.random() * arcs.length)];
  }

  /**
   * Get multiple emotional arcs
   * @param count Number of arcs to return (default: 3)
   */
  async getEmotionalArcs(count: number = 3): Promise<EmotionalArc[]> {
    const shuffled = [...mockEmotionalArcs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Analyze sentiment of text using Hugging Face API
   * @param text Text to analyze
   */
  async analyzeSentiment(text: string): Promise<SentimentResult[]> {
    if (!this.huggingFaceClient) {
      console.warn('[MoodService] Hugging Face API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockSentiment(text);
      }
      return [];
    }

    try {
      const result = await this.huggingFaceClient.post<SentimentResult[]>(
        `/models/cardiffnlp/twitter-roberta-base-sentiment`,
        { inputs: text }
      );
      return result;
    } catch (error) {
      console.warn('[MoodService] Failed to analyze sentiment, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockSentiment(text);
      }
      throw error;
    }
  }

  /**
   * Detect emotions in text using Hugging Face API
   * @param text Text to analyze
   */
  async detectEmotions(text: string): Promise<EmotionResult[]> {
    if (!this.huggingFaceClient) {
      console.warn('[MoodService] Hugging Face API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockEmotions(text);
      }
      return [];
    }

    try {
      const result = await this.huggingFaceClient.post<EmotionResult[][]>(
        `/models/${this.config.emotionModel}`,
        { inputs: text }
      );
      return result[0] || [];
    } catch (error) {
      console.warn('[MoodService] Failed to detect emotions, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockEmotions(text);
      }
      throw error;
    }
  }

  /**
   * Get list of all available emotions
   */
  async getAvailableEmotions(): Promise<string[]> {
    return mockEmotions;
  }

  /**
   * Get mood tags based on a specific emotion
   * @param emotion Target emotion
   */
  async getMoodTagsByEmotion(emotion: string): Promise<string[]> {
    const mood = mockMoods.find(m => 
      m.name.toLowerCase() === emotion.toLowerCase() ||
      m.tags.some(tag => tag.toLowerCase() === emotion.toLowerCase())
    );
    
    return mood ? mood.tags : [];
  }

  // Mock data helpers
  private getMockSentiment(text: string): SentimentResult[] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('great') || lowerText.includes('love') || lowerText.includes('awesome')) {
      return [
        { label: 'positive', score: mockSentimentAnalysis.positive.score },
        { label: 'neutral', score: 0.10 },
        { label: 'negative', score: 0.05 }
      ];
    } else if (lowerText.includes('bad') || lowerText.includes('hate') || lowerText.includes('terrible')) {
      return [
        { label: 'negative', score: mockSentimentAnalysis.negative.score },
        { label: 'neutral', score: 0.15 },
        { label: 'positive', score: 0.10 }
      ];
    }
    
    return [
      { label: 'neutral', score: mockSentimentAnalysis.neutral.score },
      { label: 'positive', score: 0.30 },
      { label: 'negative', score: 0.20 }
    ];
  }

  private getMockEmotions(text: string): EmotionResult[] {
    return [
      { label: 'joy', score: 0.35 },
      { label: 'neutral', score: 0.25 },
      { label: 'surprise', score: 0.15 },
      { label: 'anger', score: 0.10 },
      { label: 'sadness', score: 0.10 },
      { label: 'fear', score: 0.05 }
    ];
  }
}

// Factory function to create MoodService with environment variables
export function createMoodService(): MoodService {
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  return new MoodService({
    huggingFaceUrl: process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co',
    huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY,
    emotionModel: process.env.HUGGINGFACE_EMOTION_MODEL || 'j-hartmann/emotion-english-distilroberta-base',
    useMockFallback
  });
}

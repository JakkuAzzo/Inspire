import { ApiClient } from './apiClient';
import { mockWords, mockRhymes, mockWordsByTopic, mockDefinitions } from '../mocks/wordMocks';

export interface WordServiceConfig {
  datamuseUrl: string;
  randomWordUrl: string;
  dictionaryUrl: string;
  useMockFallback: boolean;
}

export interface Word {
  word: string;
  score?: number;
  tags?: string[];
  numSyllables?: number;
}

export interface WordSearchOptions {
  startsWith?: string;
  rhymeWith?: string;
  topic?: string;
  syllables?: number;
  maxResults?: number;
  tone?: 'funny' | 'deep' | 'dark';
  semantic?: 'tight' | 'balanced' | 'wild';
  mood?: string;
  timeframe?: 'fresh' | 'recent' | 'timeless';
  tags?: string[];
}

export interface WordDefinition {
  word: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export class WordService {
  private datamuseClient: ApiClient;
  private randomWordClient: ApiClient;
  private dictionaryClient: ApiClient;
  private config: WordServiceConfig;

  constructor(config: WordServiceConfig) {
    this.config = config;
    this.datamuseClient = new ApiClient({ baseURL: config.datamuseUrl });
    this.randomWordClient = new ApiClient({ baseURL: config.randomWordUrl });
    this.dictionaryClient = new ApiClient({ baseURL: config.dictionaryUrl });
  }

  /**
   * Get random words for creative prompts
   * @param count Number of words to retrieve (default: 5)
   */
  async getRandomWords(count: number = 5): Promise<string[]> {
    try {
      const words = await this.randomWordClient.get<string[]>('/word', { number: count });
      return words;
    } catch (error) {
      console.warn('[WordService] Failed to fetch random words, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockWords(count);
      }
      throw error;
    }
  }

  /**
   * Get words that rhyme with a given word
   * @param word The word to find rhymes for
   * @param maxResults Maximum number of rhymes to return (default: 10)
   */
  async getRhymes(word: string, maxResults: number = 10): Promise<Word[]> {
    try {
      const results = await this.datamuseClient.get<Word[]>('/words', {
        rel_rhy: word,
        max: maxResults,
        md: 's'
      });
      return results.map((entry) => this.enrichWord(entry));
    } catch (error) {
      console.warn('[WordService] Failed to fetch rhymes, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockRhymes(word, maxResults);
      }
      throw error;
    }
  }

  /**
   * Get words with similar meaning
   * @param word The reference word
   * @param maxResults Maximum number of results (default: 10)
   */
  async getSimilarWords(word: string, maxResults: number = 10): Promise<Word[]> {
    try {
      const results = await this.datamuseClient.get<Word[]>('/words', {
        ml: word,
        max: maxResults,
        md: 's'
      });
      return results.map((entry) => this.enrichWord(entry));
    } catch (error) {
      console.warn('[WordService] Failed to fetch similar words, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockSimilarWords(word, maxResults);
      }
      throw error;
    }
  }

  /**
   * Get words related to a topic
   * @param topic The topic to search for
   * @param maxResults Maximum number of results (default: 20)
   */
  async getWordsByTopic(topic: string, maxResults: number = 20): Promise<Word[]> {
    try {
      const results = await this.datamuseClient.get<Word[]>('/words', {
        topics: topic,
        max: maxResults,
        md: 's'
      });
      return results.map((entry) => this.enrichWord(entry));
    } catch (error) {
      console.warn('[WordService] Failed to fetch words by topic, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockWordsByTopic(topic, maxResults);
      }
      throw error;
    }
  }

  /**
   * Get definition of a word
   * @param word The word to define
   */
  async getDefinition(word: string): Promise<WordDefinition | null> {
    try {
      const results = await this.dictionaryClient.get<WordDefinition[]>(`/api/v2/entries/en/${word}`);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.warn('[WordService] Failed to fetch definition, using mock data');
      if (this.config.useMockFallback) {
        return this.getMockDefinition(word);
      }
      throw error;
    }
  }

  async searchWords(options: WordSearchOptions): Promise<Word[]> {
    const params: Record<string, any> = {
      max: options.maxResults ?? 15,
      md: 's'
    };

    if (options.startsWith) {
      const sanitized = options.startsWith.trim().toLowerCase();
      if (sanitized) {
        params.sp = `${sanitized}*`;
      }
    }

    const topics: string[] = [];
    if (options.topic) topics.push(options.topic);
    if (options.mood) topics.push(options.mood);
    if (options.tone) topics.push(options.tone);
    if (options.semantic) topics.push(options.semantic);
    if (options.timeframe) topics.push(options.timeframe);
    if (options.tags?.length) topics.push(...options.tags);
    if (topics.length) {
      params.topics = topics.join(',');
    }

    if (options.rhymeWith) {
      params.rel_rhy = options.rhymeWith;
    }

    try {
      const results = await this.datamuseClient.get<Word[]>('/words', params);
      const enriched = results.map((entry) => this.enrichWord(entry));
      if (options.syllables) {
        return enriched.filter((word) => word.numSyllables === options.syllables);
      }
      return enriched;
    } catch (error) {
      console.warn('[WordService] Failed to search words, using mock data');
      if (this.config.useMockFallback) {
        return this.getRandomMockWords(params.max ?? 10).map((word) => ({
          word,
          score: 75,
          numSyllables: 2
        }));
      }
      throw error;
    }
  }

  // Mock data fallback methods
  private getRandomMockWords(count: number): string[] {
    const shuffled = [...mockWords].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getMockRhymes(word: string, maxResults: number): Word[] {
    const rhymes = (mockRhymes as Record<string, string[]>)[word.toLowerCase()] || mockRhymes['flow'];
    return rhymes.slice(0, maxResults).map((w: string, i: number) => ({
      word: w,
      score: 100 - i * 5,
      numSyllables: Math.max(1, w.split(/[-\s]/).length)
    }));
  }

  private getMockSimilarWords(word: string, maxResults: number): Word[] {
    const similar = this.getRandomMockWords(maxResults);
    return similar.map((w, i) => ({
      word: w,
      score: 100 - i * 3
    }));
  }

  private getMockWordsByTopic(topic: string, maxResults: number): Word[] {
    const topicWords = (mockWordsByTopic as Record<string, string[]>)[topic.toLowerCase()] || mockWordsByTopic['music'];
    const words = [...topicWords];
    while (words.length < maxResults) {
      words.push(...this.getRandomMockWords(5));
    }
    return words.slice(0, maxResults).map((w: string, i: number) => ({
      word: w,
      score: 100 - i * 2,
      tags: [topic]
    }));
  }

  private getMockDefinition(word: string): WordDefinition | null {
    return (mockDefinitions as Record<string, WordDefinition>)[word.toLowerCase()] || null;
  }

  private enrichWord(entry: Word): Word {
    if (!entry.tags?.length) {
      return entry;
    }
    const syllableTag = entry.tags.find((tag) => tag.startsWith('s:'));
    if (syllableTag) {
      const amount = Number.parseInt(syllableTag.split(':')[1] ?? '', 10);
      if (!Number.isNaN(amount)) {
        entry.numSyllables = amount;
      }
    }
    return entry;
  }
}

// Factory function to create WordService with environment variables
export function createWordService(): WordService {
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  return new WordService({
    datamuseUrl: process.env.DATAMUSE_API_URL || 'https://api.datamuse.com',
    randomWordUrl: process.env.RANDOM_WORD_API_URL || 'https://random-word-api.herokuapp.com',
    dictionaryUrl: process.env.DICTIONARY_API_URL || 'https://api.dictionaryapi.dev',
    useMockFallback
  });
}

import { ApiClient } from './apiClient';
import { mockNews, mockTrendingTopics, mockRedditTopics, mockWikipediaEvents } from '../mocks/trendMocks';

type NewsProvider = 'newsapi' | 'static';

export interface TrendServiceConfig {
  newsApiUrl: string;
  newsApiKey?: string;
  redditUrl: string;
  useMockFallback: boolean;
  newsProvider?: NewsProvider;
  staticNewsCacheTtlMs?: number;
  staticNewsSearchCategories?: string[];
}

export interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  content: string;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface RedditTopic {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created: number;
  permalink: string;
}

export interface HistoricalEvent {
  year: number;
  text: string;
  pages: Array<{ title: string }>;
}

export class TrendService {
  private newsClient: ApiClient | null;
  private redditClient: ApiClient;
  private config: TrendServiceConfig;
  private newsProvider: NewsProvider;
  private staticNewsCache: Map<string, { timestamp: number; articles: NewsArticle[] }>;
  private staticCacheTtl: number;

  constructor(config: TrendServiceConfig) {
    this.config = config;
    this.newsProvider = config.newsProvider ?? (config.newsApiKey ? 'newsapi' : 'static');
    this.staticNewsCache = new Map();
    this.staticCacheTtl = config.staticNewsCacheTtlMs ?? 5 * 60 * 1000;

    this.newsClient = config.newsApiUrl
      ? new ApiClient({
          baseURL: config.newsApiUrl,
          headers:
            this.newsProvider === 'newsapi' && config.newsApiKey
              ? {
                  'X-Api-Key': config.newsApiKey
                }
              : undefined
        })
      : null;

    this.redditClient = new ApiClient({ baseURL: config.redditUrl });
  }

  /**
   * Get top news headlines
   * @param category Category filter (e.g., 'entertainment', 'technology')
   * @param country Country code (default: 'us')
   * @param pageSize Number of articles (default: 10)
   */
  async getTopHeadlines(
    category?: string,
    country: string = 'us',
    pageSize: number = 10
  ): Promise<NewsArticle[]> {
    if (!this.newsClient) {
      console.warn('[TrendService] News client unavailable, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      return [];
    }

    try {
      if (this.newsProvider === 'static') {
        const safeCategory = this.normalizeStaticCategory(category);
        const safeCountry = this.normalizeStaticCountry(country);
        const response = await this.fetchStaticTopHeadlines(safeCategory, safeCountry);
        return response.slice(0, pageSize);
      }

      const params: Record<string, string | number | undefined> = {
        country,
        pageSize
      };

      if (category) {
        params.category = category;
      }

      const response = await this.newsClient.get<{ articles: NewsArticle[] }>('/top-headlines', params);
      return response.articles;
    } catch (error) {
      console.warn('[TrendService] Failed to fetch top headlines, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      if (this.newsProvider === 'static') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Search news articles
   * @param query Search query (e.g., 'hip-hop', 'music production')
   * @param sortBy Sort by relevancy, popularity, or publishedAt
   * @param pageSize Number of articles (default: 10)
   */
  async searchNews(
    query: string,
    sortBy: 'relevancy' | 'popularity' | 'publishedAt' = 'popularity',
    pageSize: number = 10
  ): Promise<NewsArticle[]> {
    if (!this.newsClient) {
      console.warn('[TrendService] News client unavailable, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      return [];
    }

    try {
      if (this.newsProvider === 'static') {
        const articles = await this.searchStaticNews(query, pageSize);
        if (articles.length) {
          return articles;
        }
        if (this.config.useMockFallback) {
          return mockNews.slice(0, pageSize);
        }
        return [];
      }

      const response = await this.newsClient.get<{ articles: NewsArticle[] }>('/everything', {
        q: query,
        sortBy,
        pageSize
      });
      return response.articles;
    } catch (error) {
      console.warn('[TrendService] Failed to search news, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      if (this.newsProvider === 'static') {
        return [];
      }
      throw error;
    }
  }


  private normalizeStaticCategory(category?: string): string {
    const allowed = new Set(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']);
    if (!category) return 'general';
    const normalized = category.toLowerCase();
    return allowed.has(normalized) ? normalized : 'general';
  }

  private normalizeStaticCountry(country?: string): string {
    const allowed = new Set(['in', 'us', 'au', 'ru', 'fr', 'gb', 'ca', 'nz']);
    if (!country) return 'us';
    const normalized = country.toLowerCase();
    return allowed.has(normalized) ? normalized : 'us';
  }

  private async fetchStaticTopHeadlines(category: string, country: string): Promise<NewsArticle[]> {
    const cacheKey = `${category}:${country}`;
    const cached = this.staticNewsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.staticCacheTtl) {
      return cached.articles;
    }

    const endpoint = `/top-headlines/category/${category}/${country}.json`;
    const response = await this.newsClient!.get<{ articles: NewsArticle[] }>(endpoint);
    const articles = Array.isArray(response.articles) ? response.articles : [];
    this.staticNewsCache.set(cacheKey, { timestamp: Date.now(), articles });
    return articles;
  }

  private async searchStaticNews(query: string, pageSize: number): Promise<NewsArticle[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      const defaultArticles = await this.fetchStaticTopHeadlines('general', 'us');
      return defaultArticles.slice(0, pageSize);
    }

    const categories = this.config.staticNewsSearchCategories ?? ['general', 'entertainment', 'technology', 'business'];
    const country = 'us';
    const collected: NewsArticle[] = [];

    for (const category of categories) {
      try {
        const articles = await this.fetchStaticTopHeadlines(this.normalizeStaticCategory(category), country);
        for (const article of articles) {
          const haystack = `${article.title ?? ''} ${article.description ?? ''} ${article.content ?? ''}`.toLowerCase();
          if (haystack.includes(normalizedQuery)) {
            collected.push(article);
          }
        }
      } catch (error) {
        console.warn(`[TrendService] Static news fetch failed for category ${category}:`, error);
      }

      if (collected.length >= pageSize) {
        break;
      }
    }

    return collected.slice(0, pageSize);
  }

  /**
   * Get trending topics from Reddit
   * @param subreddit Subreddit name (default: 'all')
   * @param sort Sort type: 'hot', 'top', 'new', 'rising'
   * @param limit Number of posts (default: 10)
   */
  async getTrendingFromReddit(
    subreddit: string = 'all',
    sort: 'hot' | 'top' | 'new' | 'rising' = 'hot',
    limit: number = 10
  ): Promise<RedditTopic[]> {
    try {
      const response = await this.redditClient.get<{
        data: {
          children: Array<{ data: RedditTopic }>;
        };
      }>(`/r/${subreddit}/${sort}.json`, { limit });

      return response.data.children.map(child => child.data);
    } catch (error) {
      console.warn('[TrendService] Failed to fetch Reddit trends, using mock data');
      if (this.config.useMockFallback) {
        return mockRedditTopics.slice(0, limit);
      }
      throw error;
    }
  }

  /**
   * Get music-related trending topics
   * @param limit Number of topics (default: 10)
   */
  async getMusicTrends(limit: number = 10): Promise<RedditTopic[]> {
    const musicSubreddits = ['hiphopheads', 'makinghiphop', 'Music', 'WeAreTheMusicMakers'];
    const randomSub = musicSubreddits[Math.floor(Math.random() * musicSubreddits.length)];

    return this.getTrendingFromReddit(randomSub, 'hot', limit);
  }

  /**
   * Get current trending topics (mock/aggregated data)
   */
  async getCurrentTrends(): Promise<TrendingTopic[]> {
    return mockTrendingTopics;
  }

  /**
   * Get historical music events (today in history)
   */
  async getTodayInMusicHistory(): Promise<HistoricalEvent[]> {
    // In a real implementation, this would call Wikipedia API or similar
    // For now, we return curated music history events
    return mockWikipediaEvents;
  }

  /**
   * Get inspiration from multiple sources
   * @param sources Array of sources to pull from
   */
  async getMultiSourceInspiration(
    sources: Array<'news' | 'reddit' | 'trends'> = ['news', 'reddit', 'trends']
  ): Promise<{
    news: NewsArticle[];
    reddit: RedditTopic[];
    trends: TrendingTopic[];
  }> {
    const results: { news: NewsArticle[]; reddit: RedditTopic[]; trends: TrendingTopic[] } = {
      news: [],
      reddit: [],
      trends: []
    };

    const promises: Array<Promise<void>> = [];

    if (sources.includes('news')) {
      promises.push(
        this.searchNews('music', 'popularity', 5)
          .then(articles => { results.news = articles; })
          .catch(() => { results.news = []; })
      );
    }

    if (sources.includes('reddit')) {
      promises.push(
        this.getMusicTrends(5)
          .then(topics => { results.reddit = topics; })
          .catch(() => { results.reddit = []; })
      );
    }

    if (sources.includes('trends')) {
      promises.push(
        this.getCurrentTrends()
          .then(trends => { results.trends = trends.slice(0, 5); })
          .catch(() => { results.trends = []; })
      );
    }

    await Promise.all(promises);
    return results;
  }
}

// Factory function to create TrendService with environment variables
export function createTrendService(): TrendService {
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  const hasApiKey = Boolean(process.env.NEWS_API_KEY);
  const staticBase = process.env.NEWS_STATIC_API_URL || 'https://saurav.tech/NewsAPI';

  return new TrendService({
    newsApiUrl: hasApiKey ? process.env.NEWS_API_URL || 'https://newsapi.org/v2' : staticBase,
    newsApiKey: process.env.NEWS_API_KEY,
    redditUrl: process.env.REDDIT_API_URL || 'https://www.reddit.com',
    useMockFallback,
    newsProvider: hasApiKey ? 'newsapi' : 'static'
  });
}

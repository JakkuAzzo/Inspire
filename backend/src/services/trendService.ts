import { ApiClient } from './apiClient';
import { mockNews, mockTrendingTopics, mockRedditTopics, mockWikipediaEvents } from '../mocks/trendMocks';

export interface TrendServiceConfig {
  newsApiUrl: string;
  newsApiKey?: string;
  redditUrl: string;
  useMockFallback: boolean;
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

  constructor(config: TrendServiceConfig) {
    this.config = config;
    
    this.newsClient = config.newsApiKey
      ? new ApiClient({
          baseURL: config.newsApiUrl,
          headers: {
            'X-Api-Key': config.newsApiKey
          }
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
      console.warn('[TrendService] News API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      return [];
    }

    try {
      const params: any = {
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
      console.warn('[TrendService] News API key not configured, using mock data');
      if (this.config.useMockFallback) {
        return mockNews.slice(0, pageSize);
      }
      return [];
    }

    try {
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
      throw error;
    }
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
    const results: any = {
      news: [],
      reddit: [],
      trends: []
    };

    const promises = [];

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
  return new TrendService({
    newsApiUrl: process.env.NEWS_API_URL || 'https://newsapi.org/v2',
    newsApiKey: process.env.NEWS_API_KEY,
    redditUrl: process.env.REDDIT_API_URL || 'https://www.reddit.com',
    useMockFallback: process.env.USE_MOCK_FALLBACK === 'true'
  });
}

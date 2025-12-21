import fs from 'fs';
import path from 'path';

export interface NewsHeadline {
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  source?: string;
  publishedAt?: string;
}

type SimpleFetch = (input: string, init?: any) => Promise<any>;

interface NewsApiArticle {
  title?: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  source?: { id?: string | null; name?: string } | null;
  publishedAt?: string;
  content?: string;
}

interface CacheEntry {
  items: NewsHeadline[];
  expiresAt: number;
}

export class NewsService {
  private baseUrl: string;
  private apiKey?: string;
  private categories: string[];
  private country: string;
  private ttlMs: number;
  private cache: Map<string, CacheEntry>;
  private localDataDir: string;

  constructor(opts?: { baseUrl?: string; categories?: string[]; country?: string; ttlMs?: number; apiKey?: string }) {
    this.baseUrl = opts?.baseUrl || 'https://saurav.tech/NewsAPI';
    this.apiKey = opts?.apiKey || process.env.NEWS_API_KEY;
    this.categories = opts?.categories || ['general', 'technology', 'entertainment', 'science', 'business'];
    this.country = opts?.country || 'us';
    this.ttlMs = opts?.ttlMs ?? 10 * 60 * 1000; // 10 minutes
    this.cache = new Map();
    // Prefer local static dataset (mirrors SauravKanchan/NewsAPI) when available
    this.localDataDir = path.resolve(__dirname, '..', '..', 'data', 'top-headlines', 'category');
  }

  async searchHeadlines(query: string, limit: number = 5): Promise<NewsHeadline[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const cacheKey = `${normalizedQuery}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.items.slice(0, limit);
    }

    const articles: NewsApiArticle[] = [];
    for (const category of this.categories) {
      const bucket = await this.fetchCategory(category);
      if (bucket?.length) {
        articles.push(...bucket);
      }
    }

    const filtered = articles
      .filter((article) => article.title && article.url)
      .map((article) => this.toHeadline(article));

    const scored = filtered
      .map((headline) => ({
        headline,
        score: this.scoreHeadline(headline, normalizedQuery)
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.headline);

    const results = scored.slice(0, limit);
    this.cache.set(cacheKey, { items: results, expiresAt: Date.now() + this.ttlMs });
    return results;
  }

  private async fetchCategory(category: string): Promise<NewsApiArticle[]> {
    if (this.apiKey) {
      try {
        const url = `${this.baseUrl}/top-headlines?country=${this.country}&category=${category}&apiKey=${this.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as { articles?: NewsApiArticle[] };
          if (Array.isArray(data.articles)) return data.articles;
        }
      } catch (err) {
        console.warn('newsService NewsAPI call failed', err);
      }
    }

    // 1) Try local static JSON first (cloned NewsAPI data)
    try {
      const localPath = path.join(this.localDataDir, category, `${this.country}.json`);
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf8');
        if (raw) {
          const parsed = JSON.parse(raw) as { articles?: NewsApiArticle[] };
          if (parsed && Array.isArray(parsed.articles)) {
            return parsed.articles;
          }
        }
      }
    } catch (err) {
      console.warn('newsService local read failed', err);
    }

    // 2) Fallback to remote static mirror
    try {
      const url = `${this.baseUrl}/top-headlines/category/${category}/${this.country}.json`;
      const fetcher: SimpleFetch = (globalThis as any).fetch;
      if (!fetcher) return [];
      const res = await fetcher(url);
      if (!res.ok) return [];
      const data = (await res.json()) as { articles?: NewsApiArticle[] };
      return Array.isArray(data.articles) ? data.articles : [];
    } catch (err) {
      console.warn('newsService fetch failed', err);
      return [];
    }
  }

  private toHeadline(article: NewsApiArticle): NewsHeadline {
    return {
      title: article.title ?? 'Untitled',
      description: article.description ?? undefined,
      url: article.url ?? '#',
      imageUrl: article.urlToImage ?? undefined,
      source: article.source?.name ?? undefined,
      publishedAt: article.publishedAt
    };
  }

  private scoreHeadline(headline: NewsHeadline, query: string): number {
    const text = `${headline.title} ${headline.description ?? ''}`.toLowerCase();
    let score = 0;
    const terms = query.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      if (text.includes(term)) score += 2;
      if (headline.title.toLowerCase().startsWith(term)) score += 1;
    }
    if (!terms.length) score = 1;
    return score;
  }
}

export function createNewsService(): NewsService {
  return new NewsService({ baseUrl: process.env.NEWS_API_URL, apiKey: process.env.NEWS_API_KEY });
}

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

export interface HeadlineSearchOptions {
  query?: string;
  keywords?: string;
  limit?: number;
  from?: string;
  to?: string;
  random?: boolean;
  timeframe?: 'fresh' | 'recent' | 'timeless';
  seed?: string | number;
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

  async searchHeadlines(input: string | HeadlineSearchOptions, limit: number = 5): Promise<NewsHeadline[]> {
    const options: HeadlineSearchOptions = typeof input === 'string' ? { query: input, limit } : input;
    const requestedLimit = Math.min(20, Math.max(1, options.limit ?? limit ?? 5));
    const normalizedQuery = (options.query ?? '').trim().toLowerCase();
    const keywordTerms = (options.keywords ?? '')
      .split(',')
      .flatMap((entry) => entry.split(/\s+/))
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
    const terms = [
      ...normalizedQuery.split(/\s+/).filter(Boolean),
      ...keywordTerms
    ];
    const random = Boolean(options.random);
    const fromDate = this.parseDate(options.from) ?? this.mapTimeframeToDate(options.timeframe);
    const toDate = this.parseDate(options.to);
    const cacheKey = `${terms.join(' ')}:${requestedLimit}:${fromDate?.toISOString() ?? ''}:${toDate?.toISOString() ?? ''}:${random ? 'random' : 'scored'}:${options.seed ?? ''}`;

    if (!random) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.items.slice(0, requestedLimit);
      }
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
      .map((article) => this.toHeadline(article))
      .filter((headline) => this.isWithinRange(headline.publishedAt, fromDate, toDate));

    if (!filtered.length) return [];

    if (random && !terms.length) {
      const randomized = this.shuffle(filtered, options.seed).slice(0, requestedLimit);
      return randomized;
    }

    const scored = filtered
      .map((headline, index) => ({
        headline,
        score: this.scoreHeadline(headline, terms) + (random ? this.randomJitter(options.seed, index) : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.headline)
      .slice(0, requestedLimit);

    if (!random) {
      this.cache.set(cacheKey, { items: scored, expiresAt: Date.now() + this.ttlMs });
    }

    return scored;
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

  private scoreHeadline(headline: NewsHeadline, terms: string[]): number {
    const text = `${headline.title} ${headline.description ?? ''}`.toLowerCase();
    if (!terms.length) return 1;
    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) score += 2;
      if (headline.title.toLowerCase().startsWith(term)) score += 1;
    }
    return score;
  }

  private isWithinRange(publishedAt?: string, fromDate?: Date | null, toDate?: Date | null): boolean {
    if (!fromDate && !toDate) return true;
    if (!publishedAt) return false;
    const published = new Date(publishedAt);
    if (Number.isNaN(published.getTime())) return false;
    if (fromDate && published < fromDate) return false;
    if (toDate && published > toDate) return false;
    return true;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private mapTimeframeToDate(timeframe?: string): Date | null {
    if (!timeframe) return null;
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    if (timeframe === 'fresh') return new Date(now - 7 * DAY);
    if (timeframe === 'recent') return new Date(now - 30 * DAY);
    return null;
  }

  private shuffle(headlines: NewsHeadline[], seed?: string | number): NewsHeadline[] {
    const copy = [...headlines];
    if (seed === undefined) {
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    let state = this.seedToNumber(seed);
    for (let i = copy.length - 1; i > 0; i -= 1) {
      state = (state * 1664525 + 1013904223) % 0xffffffff;
      const j = state % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private randomJitter(seed: string | number | undefined, salt: number): number {
    if (seed === undefined) return Math.random() * 0.5;
    const value = this.seedToNumber(`${seed}-${salt}`);
    return ((value % 1000) / 1000) * 0.5;
  }

  private seedToNumber(seed: string | number): number {
    const str = String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash || 1;
  }
}

export function createNewsService(): NewsService {
  return new NewsService({ baseUrl: process.env.NEWS_API_URL, apiKey: process.env.NEWS_API_KEY });
}

import { ApiClient } from './apiClient';
import { LruCache } from '../utils/cache';

export interface YouTubeServiceConfig {
  pipedApiUrl: string;
  useMockFallback: boolean;
}

export interface InstrumentalVideo {
  id: string;
  title: string;
  uploader: string;
  url: string;
  thumbnail?: string;
  durationSeconds?: number;
}

const MOCK_INSTRUMENTALS: InstrumentalVideo[] = [
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    uploader: 'Lofi Girl',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    durationSeconds: 3600
  },
  {
    id: 'hHW1oY26kxQ',
    title: 'lofi hip hop mix - beats to relax/study to',
    uploader: 'ChilledCow',
    url: 'https://www.youtube.com/watch?v=hHW1oY26kxQ',
    durationSeconds: 7200
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'lofi hip hop radio - beats to relax/study to (Chillhop Music)',
    uploader: 'Chillhop Music',
    url: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
    durationSeconds: 7200
  }
];

interface PipedSearchItem {
  url: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploaderName?: string;
  uploaderUrl?: string;
  uploaded?: number;
  isShort?: boolean;
}

export class YouTubeService {
  private client: ApiClient;
  private config: YouTubeServiceConfig;
  private cache = new LruCache<string, InstrumentalVideo[]>(50);

  constructor(config: YouTubeServiceConfig) {
    this.config = config;
    this.client = new ApiClient({ baseURL: config.pipedApiUrl });
  }

  async searchInstrumentals(query: string, limit: number = 5): Promise<InstrumentalVideo[]> {
    const cacheKey = `${query}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get<{ items?: PipedSearchItem[] } | PipedSearchItem[]>(`/search`, {
        q: query,
        filter: 'music',
        region: 'US'
      });

      const items = Array.isArray(response) ? response : response.items;

      if (!Array.isArray(items)) {
        return this.getFallback(limit);
      }

      // Filter out Shorts and probe for embeddability via YouTube oEmbed
      const playable: InstrumentalVideo[] = [];
      for (const item of items) {
        if (!item || item.isShort || !item.title) continue;
        const vid = this.toInstrumental(item);
        const ok = await this.isEmbeddableOnYouTube(vid.id);
        if (ok) {
          playable.push(vid);
          if (playable.length >= limit) break;
        }
      }

      const results = playable.length ? playable : this.getFallback(limit);
      this.cache.set(cacheKey, results, 60 * 1000);
      return results;
    } catch (error) {
      if (this.config.useMockFallback) {
        return this.getFallback(limit);
      }
      throw error;
    }
  }

  private toInstrumental(item: PipedSearchItem): InstrumentalVideo {
    const watchUrl = item.url?.startsWith('http') ? item.url : `https://piped.video${item.url ?? ''}`;
    const id = this.extractVideoId(item.url ?? '') || Math.random().toString(36).slice(2);

    return {
      id,
      title: item.title,
      uploader: item.uploaderName ?? 'Unknown creator',
      url: watchUrl,
      thumbnail: item.thumbnail,
      durationSeconds: item.duration
    };
  }

  private extractVideoId(url: string): string | null {
    if (!url) return null;
    // Handle standard YouTube links
    if (url.includes('watch?v=')) {
      const parsed = new URL(url.startsWith('http') ? url : `https://youtube.com${url}`);
      const v = parsed.searchParams.get('v');
      if (v) return v;
    }
    // Handle /watch/VIDEOID or /v/VIDEOID patterns
    const match = url.match(/(?:watch\/|v\/|embed\/)([A-Za-z0-9_-]{6,})/);
    if (match && match[1]) return match[1];
    // Fallback to last path segment
    const parts = url.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1].replace(/\?.*$/, '') : null;
  }

  /**
   * Probe YouTube oEmbed to determine if a given video ID is embeddable.
   * Non-embeddable or restricted videos typically return 401/403.
   */
  private async isEmbeddableOnYouTube(videoId: string): Promise<boolean> {
    if (!videoId) return false;
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      return res.ok;
    } catch {
      return false;
    }
  }

  private getFallback(limit: number): InstrumentalVideo[] {
    return MOCK_INSTRUMENTALS.slice(0, limit);
  }

  getHealth() {
    return {
      name: 'youtube',
      status: this.config.pipedApiUrl ? 'ok' : 'degraded',
      cache: this.cache.metrics(),
      endpoint: this.config.pipedApiUrl
    };
  }
}

export function createYouTubeService(): YouTubeService {
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  return new YouTubeService({
    pipedApiUrl: process.env.PIPED_API_URL || 'https://piped.video/api/v1',
    useMockFallback
  });
}

import { ApiClient } from './apiClient';

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
    id: 'mock-aurora-jazz',
    title: 'Aurora Skyline (Jazz Instrumental)',
    uploader: 'Inspire Mock Library',
    url: 'https://www.youtube.com/watch?v=dummyaurora',
    durationSeconds: 228
  },
  {
    id: 'mock-late-night-lofi',
    title: 'Late Night Lo-Fi Tape Loop',
    uploader: 'Inspire Mock Library',
    url: 'https://www.youtube.com/watch?v=mocklofi',
    durationSeconds: 312
  },
  {
    id: 'mock-hype-drill',
    title: 'Hype Drill 140bpm (Creative Commons)',
    uploader: 'Inspire Mock Library',
    url: 'https://www.youtube.com/watch?v=mockdrill',
    durationSeconds: 185
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

  constructor(config: YouTubeServiceConfig) {
    this.config = config;
    this.client = new ApiClient({ baseURL: config.pipedApiUrl });
  }

  async searchInstrumentals(query: string, limit: number = 5): Promise<InstrumentalVideo[]> {
    try {
      const items = await this.client.get<PipedSearchItem[]>(`/search`, {
        q: query,
        filter: 'music',
        region: 'US'
      });

      if (!Array.isArray(items)) {
        return this.getFallback(limit);
      }

      const parsed = items
        .filter((item) => Boolean(item) && !item.isShort && item.title)
        .slice(0, limit)
        .map((item) => this.toInstrumental(item));

      return parsed.length ? parsed : this.getFallback(limit);
    } catch (error) {
      if (this.config.useMockFallback) {
        return this.getFallback(limit);
      }
      throw error;
    }
  }

  private toInstrumental(item: PipedSearchItem): InstrumentalVideo {
    const id = item.url?.split('?v=').pop() ?? item.url ?? Math.random().toString(36).slice(2);
    const watchUrl = item.url?.startsWith('http') ? item.url : `https://piped.video${item.url ?? ''}`;

    return {
      id,
      title: item.title,
      uploader: item.uploaderName ?? 'Unknown creator',
      url: watchUrl,
      thumbnail: item.thumbnail,
      durationSeconds: item.duration
    };
  }

  private getFallback(limit: number): InstrumentalVideo[] {
    return MOCK_INSTRUMENTALS.slice(0, limit);
  }
}

export function createYouTubeService(): YouTubeService {
  return new YouTubeService({
    pipedApiUrl: process.env.PIPED_API_URL || 'https://piped.video/api/v1',
    useMockFallback: process.env.USE_MOCK_FALLBACK === 'true'
  });
}

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
  const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
  return new YouTubeService({
    pipedApiUrl: process.env.PIPED_API_URL || 'https://piped.video/api/v1',
    useMockFallback
  });
}

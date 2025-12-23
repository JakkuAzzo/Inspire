import { YouTubeService } from '../dist/services/youtubeService';
import * as apiClientModule from '../dist/services/apiClient';

describe('YouTubeService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps piped search results and prefers API over fallback', async () => {
    const mockItems = [
      {
        url: '/watch?v=abc123',
        title: 'Test Track',
        uploaderName: 'Uploader',
        thumbnail: 'thumb.jpg',
        duration: 120
      }
    ];

    jest.spyOn(apiClientModule.ApiClient.prototype, 'get').mockResolvedValue({ items: mockItems });
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as any);

    const service = new YouTubeService({ pipedApiUrl: 'https://piped.test/api/v1', useMockFallback: false });
    const results = await service.searchInstrumentals('lofi', 1);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'abc123',
      title: 'Test Track',
      uploader: 'Uploader',
      url: 'https://piped.video/watch?v=abc123'
    });
  });
});

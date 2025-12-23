import { MemeService } from '../dist/services/memeService';
import * as apiClientModule from '../dist/services/apiClient';
import { mockMemes } from '../dist/mocks/memeMocks';

describe('MemeService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns upstream Imgflip templates when available', async () => {
    const mockTemplate = [{ id: '1', name: 'Sample', url: 'https://imgflip.com/1', width: 1, height: 1 }];
    jest.spyOn(apiClientModule.ApiClient.prototype, 'get').mockResolvedValue({ success: true, data: { memes: mockTemplate } });

    const service = new MemeService({
      imgflipUrl: 'https://api.imgflip.com',
      imgflipUsername: 'user',
      imgflipPassword: 'pass',
      unsplashUrl: 'https://api.unsplash.com',
      redditUrl: 'https://reddit.com',
      useMockFallback: true
    });

    const memes = await service.getMemes();
    expect(memes).toEqual(mockTemplate);
  });

  it('falls back to mock memes only when upstream is empty', async () => {
    jest.spyOn(apiClientModule.ApiClient.prototype, 'get').mockResolvedValue({ success: true, data: { memes: [] } });

    const service = new MemeService({
      imgflipUrl: 'https://api.imgflip.com',
      imgflipUsername: 'user',
      imgflipPassword: 'pass',
      unsplashUrl: 'https://api.unsplash.com',
      redditUrl: 'https://reddit.com',
      useMockFallback: true
    });

    const memes = await service.getMemes();
    expect(memes).toEqual(mockMemes);
  });
});

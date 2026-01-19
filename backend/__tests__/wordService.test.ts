import { WordService, WordServiceConfig } from '../src/services/wordService';
import { ApiClient } from '../src/services/apiClient';

type MockGet = jest.MockedFunction<ApiClient['get']>;

const mockGet: MockGet = jest.fn();

jest.mock('../src/services/apiClient', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    get: mockGet
  }))
}));

describe('WordService API + fallback behavior', () => {
  const baseConfig: WordServiceConfig = {
    datamuseUrl: 'https://datamuse.test',
    randomWordUrl: 'https://random.test',
    dictionaryUrl: 'https://dictionary.test',
    useMockFallback: true
  };

  beforeEach(() => {
    mockGet.mockReset();
  });

  test('getRandomWords returns live API results when available', async () => {
    const words = ['spark', 'pulse', 'echo'];
    mockGet.mockResolvedValueOnce(words);

    const service = new WordService(baseConfig);
    const result = await service.getRandomWords(3);

    expect(mockGet).toHaveBeenCalledWith('/word', { number: 3 });
    expect(result).toEqual(words);
  });

  test('getRhymes falls back to mocks when the API fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));

    const service = new WordService(baseConfig);
    const result = await service.getRhymes('flow', 2);

    expect(mockGet).toHaveBeenCalledWith('/words', expect.any(Object));
    expect(result).toHaveLength(2);
    result.forEach((entry) => {
      expect(entry.word).toBeTruthy();
      expect(entry.numSyllables).toBeDefined();
    });
  });
});

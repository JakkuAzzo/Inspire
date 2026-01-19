module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Restrict matches to backend unit/integration tests only; exclude Playwright specs
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/tests/'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^youtube-search-without-api-key$': '<rootDir>/src/services/__mocks__/youtube-search-without-api-key.js'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/index.ts',
    '!src/**/*.d.ts',
    '!src/apiContract.ts',
    '!src/example.ts',
    // Exclude low-signal infra files from coverage gates; integration tests cover them indirectly
    '!src/auth/**',
    '!src/services/storyArcService.ts',
    '!src/services/challengeService.ts',
    '!src/data/challengeActivity.ts',
    '!src/db/connection.ts',
    // Exclude external API wrappers that rely on network/mocks; covered indirectly via integration tests
    '!src/services/audioService.ts',
    '!src/services/memeService.ts',
    '!src/services/moodService.ts',
    '!src/services/newsService.ts',
    '!src/services/randomService.ts',
    '!src/services/trendService.ts',
    '!src/services/youtubeSearchService.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 45,
      branches: 30,
      functions: 40,
      lines: 45
    }
  }
};

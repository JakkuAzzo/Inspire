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
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/index.ts'],
  coverageThreshold: {
    global: {
      statements: 2,
      branches: 0,
      functions: 2,
      lines: 2
    }
  }
};

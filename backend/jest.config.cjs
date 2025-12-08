module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Restrict matches to backend unit/integration tests only; exclude Playwright specs
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/tests/'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};

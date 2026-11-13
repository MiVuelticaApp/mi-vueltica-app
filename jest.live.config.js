/** Live API contract test (src/data/http/__tests__/live.api.test.ts): plain Node environment, so the real `fetch` is used. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/data/http/__tests__/live.api.test.ts'],
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  transformIgnorePatterns: ['/node_modules/(?!(expo|@expo|expo-[^/]+)/)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

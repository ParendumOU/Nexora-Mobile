// Jest config for the Expo / React Native app.
// Uses the jest-expo preset (RN test environment + transforms) and adds a setup
// file that mocks native-only modules (expo-secure-store / expo-camera /
// expo-router) so unit + component tests can run in a plain Node CI container.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // jest-expo ships RN-aware transforms; we still need to let Babel process the
  // RN / Expo ESM packages that ship untranspiled. Everything else stays ignored.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-markdown-display|zustand)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'cobertura', 'lcov'],
  clearMocks: true,
};

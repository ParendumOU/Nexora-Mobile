// Jest config for the Expo / React Native app.
// Uses the jest-expo preset (RN test environment + transforms) and adds a setup
// file that mocks native-only modules (expo-secure-store / expo-camera /
// expo-router) so unit + component tests can run in a plain Node CI container.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // jest-expo ships RN-aware transforms; we still need to let Babel process the
  // RN / Expo ESM packages that ship untranspiled. Everything else stays ignored.
  // Two things must hold for jest to transform RN/Expo deps (they ship
  // untranspiled Flow/ESM):
  //   1. pnpm nests deps under .pnpm/<pkg>@<ver>/node_modules/, so the lookahead
  //      peers past that segment.
  //   2. Unscoped packages are prefix-matched ([^/]*) — e.g. `expo-modules-core`,
  //      `react-native-reanimated` — not just the bare `expo`/`react-native`
  //      segment (the old `expo(nent)?/` only matched `expo/`, so expo-modules-core
  //      was wrongly ignored → "Cannot use import statement outside a module").
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native[^/]*|@react-native[^/]*/.*|expo[^/]*|@expo[^/]*/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|zustand)/)',
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

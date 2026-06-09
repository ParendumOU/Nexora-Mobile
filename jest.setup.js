/* eslint-disable @typescript-eslint/no-var-requires */
// Global test setup: mock the native-only Expo / router modules so the logic
// under test runs in a plain Node environment. Individual tests can override
// these with jest.mock(...) / mockReturnValue as needed.

require('@testing-library/react-native/extend-expect');

// ── expo-secure-store: in-memory keychain ─────────────────────────────────────
jest.mock('expo-secure-store', () => {
  const mem = new Map();
  return {
    WHEN_UNLOCKED: 'whenUnlocked',
    setItemAsync: jest.fn(async (k, v) => {
      mem.set(k, v);
    }),
    getItemAsync: jest.fn(async (k) => (mem.has(k) ? mem.get(k) : null)),
    deleteItemAsync: jest.fn(async (k) => {
      mem.delete(k);
    }),
    __mem: mem,
  };
});

// ── expo-camera: no-op CameraView + permission hook ───────────────────────────
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: (props) => React.createElement('CameraView', props, props.children),
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(async () => ({ granted: true, status: 'granted' })),
    ],
  };
});

// ── expo-router: stub navigation primitives ───────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: { Screen: 'Stack.Screen' },
  Tabs: { Screen: 'Tabs.Screen' },
}));

// ── expo-haptics: no-op ───────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Silence the reanimated warning in the RN test env if it gets pulled in.
global.__reanimatedWorkletInit = () => {};

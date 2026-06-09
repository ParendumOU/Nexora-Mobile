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

// ── @expo/vector-icons: render any icon set as a simple host element ──────────
// Avoids the real createIconSet path, which reaches into expo-font's native
// `loadedNativeFonts` (undefined in node → "loadedNativeFonts.forEach is not a
// function"). A Proxy returns a stub component for every icon family.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return new Proxy(
    {},
    { get: () => (props) => React.createElement('Icon', props, props.children) }
  );
});

// ── expo-font: no native font registry in node ────────────────────────────────
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(async () => {}),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  loadedNativeFonts: [],
}));

// ── expo-linear-gradient: passthrough host element ────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: (props) => React.createElement('LinearGradient', props, props.children),
  };
});

// ── react-native-safe-area-context: provide static insets (no provider tree) ──
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: (props) => React.createElement('SafeAreaView', props, props.children),
    SafeAreaInsetsContext: React.createContext(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Silence the reanimated warning in the RN test env if it gets pulled in.
global.__reanimatedWorkletInit = () => {};

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Session } from './types';

const KEY = 'nexora.session.v1';

// expo-secure-store is native-only. On web (preview/testing) fall back to
// localStorage so the app boots and the session persists across reloads.
const isWeb = Platform.OS === 'web';

async function setItem(value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function getItem(): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function removeItem(): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}

/** Persist the full session (incl. the long-lived device secret). */
export async function saveSession(session: Session): Promise<void> {
  await setItem(JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await getItem();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await removeItem();
}

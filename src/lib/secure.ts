import * as SecureStore from 'expo-secure-store';
import type { Session } from './types';

const KEY = 'nexora.session.v1';

/** Persist the full session (incl. the long-lived device secret) in the OS keychain. */
export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

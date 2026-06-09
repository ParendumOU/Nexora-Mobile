import * as SecureStore from 'expo-secure-store';
import { saveSession, loadSession, clearSession } from '@/lib/secure';
import type { Session } from '@/lib/types';

const SESSION: Session = {
  serverUrl: 'https://nexora.local',
  deviceToken: 'nxd_abc123',
  accessToken: 'jwt.access.token',
  deviceId: 'dev-1',
  orgId: 'org-1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
};

describe('secure session persistence (native path)', () => {
  it('round-trips a session through the keychain', async () => {
    await saveSession(SESSION);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'nexora.session.v1',
      JSON.stringify(SESSION),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED },
    );
    const loaded = await loadSession();
    expect(loaded).toEqual(SESSION);
  });

  it('stores the long-lived nxd_ device secret in the keychain', async () => {
    await saveSession(SESSION);
    const stored = (SecureStore.setItemAsync as jest.Mock).mock.calls.at(-1)?.[1];
    expect(JSON.parse(stored).deviceToken).toBe('nxd_abc123');
  });

  it('returns null when nothing is stored', async () => {
    await clearSession();
    expect(await loadSession()).toBeNull();
  });

  it('returns null (not throw) on corrupt JSON', async () => {
    await SecureStore.setItemAsync('nexora.session.v1', '{not json');
    expect(await loadSession()).toBeNull();
  });

  it('clearSession deletes the keychain entry', async () => {
    await saveSession(SESSION);
    await clearSession();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('nexora.session.v1');
    expect(await loadSession()).toBeNull();
  });
});

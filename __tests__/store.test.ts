import { useStore } from '@/lib/store';
import * as secure from '@/lib/secure';
import type { Session } from '@/lib/types';

const SESSION: Session = {
  serverUrl: 'https://nexora.local',
  deviceToken: 'nxd_abc',
  accessToken: 'jwt1',
  deviceId: 'dev-1',
  orgId: 'org-1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
};

describe('zustand session store', () => {
  beforeEach(() => {
    useStore.setState({ hydrated: false, session: null });
    jest.restoreAllMocks();
  });

  it('starts unhydrated with no session', () => {
    expect(useStore.getState().hydrated).toBe(false);
    expect(useStore.getState().session).toBeNull();
  });

  it('hydrate loads a persisted session and flips hydrated', async () => {
    jest.spyOn(secure, 'loadSession').mockResolvedValue(SESSION);
    await useStore.getState().hydrate();
    expect(useStore.getState().session).toEqual(SESSION);
    expect(useStore.getState().hydrated).toBe(true);
  });

  it('hydrate still sets hydrated=true when no session exists', async () => {
    jest.spyOn(secure, 'loadSession').mockResolvedValue(null);
    await useStore.getState().hydrate();
    expect(useStore.getState().session).toBeNull();
    expect(useStore.getState().hydrated).toBe(true);
  });

  it('setSession persists and stores the session', async () => {
    const save = jest.spyOn(secure, 'saveSession').mockResolvedValue();
    await useStore.getState().setSession(SESSION);
    expect(save).toHaveBeenCalledWith(SESSION);
    expect(useStore.getState().session).toEqual(SESSION);
  });

  it('patchAccessToken swaps only the access token and re-persists', async () => {
    const save = jest.spyOn(secure, 'saveSession').mockResolvedValue();
    useStore.setState({ session: SESSION });
    await useStore.getState().patchAccessToken('jwt2');
    const s = useStore.getState().session!;
    expect(s.accessToken).toBe('jwt2');
    expect(s.deviceToken).toBe('nxd_abc'); // device secret untouched
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'jwt2' }));
  });

  it('patchAccessToken is a no-op when there is no session', async () => {
    const save = jest.spyOn(secure, 'saveSession').mockResolvedValue();
    await useStore.getState().patchAccessToken('jwt2');
    expect(useStore.getState().session).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('signOut clears storage and nulls the session', async () => {
    const clear = jest.spyOn(secure, 'clearSession').mockResolvedValue();
    useStore.setState({ session: SESSION });
    await useStore.getState().signOut();
    expect(clear).toHaveBeenCalled();
    expect(useStore.getState().session).toBeNull();
  });
});

import { api, ApiError, normalizeMessage } from '@/lib/api';
import { useStore } from '@/lib/store';
import * as secure from '@/lib/secure';
import type { Session, RawMessage } from '@/lib/types';

const SESSION: Session = {
  serverUrl: 'https://nexora.local',
  deviceToken: 'nxd_secret',
  accessToken: 'jwt-old',
  deviceId: 'dev-1',
  orgId: 'org-1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
};

function res(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('authenticated request core', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.spyOn(secure, 'saveSession').mockResolvedValue();
    jest.spyOn(secure, 'clearSession').mockResolvedValue();
    useStore.setState({ hydrated: true, session: { ...SESSION } });
  });

  it('throws 401 "Not linked" when there is no session', async () => {
    useStore.setState({ session: null });
    await expect(api.listChats()).rejects.toMatchObject({ status: 401, message: 'Not linked' });
  });

  it('injects the bearer token and prefixes the /api base path', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res([]));
    await api.listChats();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://nexora.local/api/chats/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-old' }),
      }),
    );
  });

  it('sets Content-Type only when a body is present', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res({ id: 'c1' }));
    await api.createChat({ title: 'x' });
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns undefined for a 204 No Content', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res(undefined, 204));
    await expect(api.archiveChat('c1')).resolves.toBeUndefined();
  });

  it('refreshes once on 401 then retries with the new token and succeeds', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(res({}, 401)) // first protected call -> 401
      .mockResolvedValueOnce(res({ access_token: 'jwt-new' })) // refresh
      .mockResolvedValueOnce(res([{ id: 'c1', title: 't' }])); // retry

    const out = await api.listChats();
    expect(out).toEqual([{ id: 'c1', title: 't' }]);
    // refresh hit the device/refresh endpoint
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
      'https://nexora.local/api/auth/device/refresh',
    );
    // retry used the refreshed token
    expect((global.fetch as jest.Mock).mock.calls[2][1].headers.Authorization).toBe('Bearer jwt-new');
  });

  it('signs the device out when the refresh itself returns 401', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(res({}, 401)) // protected call
      .mockResolvedValueOnce(res({}, 401)); // refresh rejected -> force re-link

    await expect(api.listChats()).rejects.toMatchObject({ status: 401 });
    expect(secure.clearSession).toHaveBeenCalled();
    expect(useStore.getState().session).toBeNull();
  });

  it('does NOT sign out on a transient refresh failure (5xx) — surfaces 503', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(res({}, 401)) // protected call
      .mockResolvedValueOnce(res({}, 500)); // refresh 5xx -> transient

    await expect(api.listChats()).rejects.toMatchObject({ status: 503 });
    expect(secure.clearSession).not.toHaveBeenCalled();
    expect(useStore.getState().session).not.toBeNull();
  });

  it('does not retry a second time (no infinite loop) on repeated 401 after refresh', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(res({}, 401)) // protected call
      .mockResolvedValueOnce(res({ access_token: 'jwt-new' })) // refresh ok
      .mockResolvedValueOnce(res({}, 401)); // retry STILL 401

    await expect(api.listChats()).rejects.toMatchObject({ status: 401 });
    // exactly 3 fetches: call, refresh, retry — no further retry
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(3);
  });

  it('propagates non-401 errors with the server detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res({ detail: 'Boom' }, 422));
    await expect(api.listChats()).rejects.toMatchObject({ status: 422, message: 'Boom' });
  });

  it('getMessages normalizes and drops non-displayable messages', async () => {
    const raw: RawMessage[] = [
      { id: '1', role: 'user', content: 'hello' },
      { id: '2', role: 'assistant', content: '' }, // empty -> dropped
      { id: '3', role: 'assistant', content: 'tool noise', excluded: true }, // excluded, no user -> dropped
      { id: '4', role: 'assistant', content: 'real reply', agent_name: 'Atlas' },
    ];
    (global.fetch as jest.Mock).mockResolvedValue(res(raw));
    const msgs = await api.getMessages('c1');
    expect(msgs.map((m) => m.id)).toEqual(['1', '4']);
    expect(msgs[1].role).toBe('assistant');
  });

  it('listChats uses the trailing-slash path to avoid a 307 redirect', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res([]));
    await api.listChats();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/chats\/$/);
  });
});

describe('ApiError', () => {
  it('carries the status code', () => {
    const e = new ApiError(404, 'nope');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(404);
    expect(e.message).toBe('nope');
  });
});

// sanity re-export so this file also touches normalizeMessage in the api module
describe('module wiring', () => {
  it('exports normalizeMessage', () => {
    expect(typeof normalizeMessage).toBe('function');
  });
});

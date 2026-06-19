import { pairDevice, refreshAccessToken, ApiError } from '@/lib/api';
import { useStore } from '@/lib/store';
import * as secure from '@/lib/secure';
import type { Session } from '@/lib/types';

const SESSION: Session = {
  serverUrl: 'https://nexora.local',
  deviceToken: 'nxd_secret',
  accessToken: 'jwt-old',
  deviceId: 'dev-1',
  orgId: 'org-1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('pairDevice', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.spyOn(secure, 'saveSession').mockResolvedValue();
    useStore.setState({ hydrated: true, session: null });
  });

  it('POSTs the pairing code/name/platform to /api/auth/device/pair', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({
        access_token: 'jwt-new',
        device_token: 'nxd_secret',
        device_id: 'dev-1',
        org_id: 'org-1',
        user_name: 'Alice',
        user_email: 'alice@example.com',
      }),
    );

    const session = await pairDevice('https://nexora.local', 'ABCD2345', 'iPhone', 'ios');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://nexora.local/api/auth/device/pair',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ABCD2345', device_name: 'iPhone', platform: 'ios' }),
      }),
    );
    // Maps the snake_case API payload into the camelCase Session shape.
    expect(session).toEqual({
      serverUrl: 'https://nexora.local',
      deviceToken: 'nxd_secret',
      accessToken: 'jwt-new',
      deviceId: 'dev-1',
      orgId: 'org-1',
      userName: 'Alice',
      userEmail: 'alice@example.com',
    });
  });

  it('throws an ApiError with the server detail on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ detail: 'Pairing code expired' }, 400),
    );
    await expect(pairDevice('https://nexora.local', 'BAD', 'iPhone', 'ios')).rejects.toMatchObject({
      status: 400,
      message: 'Pairing code expired',
    });
  });

  it('throws a generic ApiError when the error body has no detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({}, 500));
    const err = await pairDevice('https://x', 'c', 'n', 'ios').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Pairing failed');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.spyOn(secure, 'saveSession').mockResolvedValue();
    useStore.setState({ hydrated: true, session: SESSION });
  });

  it('POSTs the device_token to /api/auth/device/refresh and patches the store', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ access_token: 'jwt-fresh' }));
    const token = await refreshAccessToken(SESSION);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://nexora.local/api/auth/device/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ device_token: 'nxd_secret' }),
      }),
    );
    expect(token).toBe('jwt-fresh');
    expect(useStore.getState().session?.accessToken).toBe('jwt-fresh');
  });

  it('throws a 401 ApiError when the device token is rejected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({}, 401));
    await expect(refreshAccessToken(SESSION)).rejects.toMatchObject({ status: 401 });
  });
});

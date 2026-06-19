import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LinkScreen from '../app/link';
import { useStore } from '@/lib/store';
import * as secure from '@/lib/secure';

function res(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('LinkScreen manual pairing flow', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.spyOn(secure, 'saveSession').mockResolvedValue();
    useStore.setState({ hydrated: true, session: null });
  });

  it('renders the primary scan call-to-action', () => {
    const { getByText } = render(<LinkScreen />);
    expect(getByText('Scan pairing QR code')).toBeTruthy();
  });

  it('reveals manual entry fields when the toggle is pressed', () => {
    const { getByText, queryByPlaceholderText } = render(<LinkScreen />);
    expect(queryByPlaceholderText('https://nexora.mycompany.com')).toBeNull();
    fireEvent.press(getByText('Enter details manually'));
    expect(queryByPlaceholderText('https://nexora.mycompany.com')).toBeTruthy();
  });

  it('pairs via manual entry, normalizes the URL, and stores the session', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      res({
        access_token: 'jwt-new',
        device_token: 'nxd_secret',
        device_id: 'dev-1',
        org_id: 'org-1',
        user_name: 'Alice',
        user_email: 'alice@example.com',
      }),
    );

    const { getByText, getByPlaceholderText } = render(<LinkScreen />);
    fireEvent.press(getByText('Enter details manually'));

    fireEvent.changeText(getByPlaceholderText('https://nexora.mycompany.com'), 'nexora.local/api/');
    fireEvent.changeText(getByPlaceholderText('ABCD2345'), 'abcd2345');

    fireEvent.press(getByText('Link device'));

    await waitFor(() => expect(useStore.getState().session).not.toBeNull());

    // URL normalized (https prefix + /api stripped) before the pair POST.
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://nexora.local/api/auth/device/pair',
    );
    // Pairing code upper-cased by the field, forwarded in the body.
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.code).toBe('ABCD2345');
    expect(useStore.getState().session?.accessToken).toBe('jwt-new');
  });

  it('surfaces a pairing error from the server without storing a session', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(res({ detail: 'Pairing code expired' }, 400));

    const { getByText, getByPlaceholderText } = render(<LinkScreen />);
    fireEvent.press(getByText('Enter details manually'));
    fireEvent.changeText(getByPlaceholderText('https://nexora.mycompany.com'), 'nexora.local');
    fireEvent.changeText(getByPlaceholderText('ABCD2345'), 'BAD1');
    fireEvent.press(getByText('Link device'));

    await waitFor(() => expect(getByText('Pairing code expired')).toBeTruthy());
    expect(useStore.getState().session).toBeNull();
  });
});

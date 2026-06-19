import { normalizeServerUrl, wsUrlFor, normalizeMessage } from '@/lib/api';
import type { RawMessage } from '@/lib/types';

describe('normalizeServerUrl', () => {
  it('prefixes https:// when no scheme is given', () => {
    expect(normalizeServerUrl('nexora.mycompany.com')).toBe('https://nexora.mycompany.com');
  });

  it('preserves an explicit http scheme (LAN/dev)', () => {
    expect(normalizeServerUrl('http://10.0.0.5:8000')).toBe('http://10.0.0.5:8000');
  });

  it('preserves an explicit https scheme', () => {
    expect(normalizeServerUrl('https://nexora.local')).toBe('https://nexora.local');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeServerUrl('  nexora.local  ')).toBe('https://nexora.local');
  });

  it('strips trailing slashes', () => {
    expect(normalizeServerUrl('https://nexora.local///')).toBe('https://nexora.local');
  });

  it('strips a trailing /api segment (case-insensitive)', () => {
    expect(normalizeServerUrl('https://nexora.local/api')).toBe('https://nexora.local');
    expect(normalizeServerUrl('https://nexora.local/API')).toBe('https://nexora.local');
  });

  it('strips trailing slash then /api in combination', () => {
    expect(normalizeServerUrl('nexora.local/api/')).toBe('https://nexora.local');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeServerUrl('')).toBe('');
    expect(normalizeServerUrl('   ')).toBe('');
  });
});

describe('wsUrlFor', () => {
  it('rewrites https -> wss and builds the chat ws path', () => {
    expect(wsUrlFor('https://nexora.local', 'chat-1', 'tok')).toBe(
      'wss://nexora.local/ws/chat/chat-1?token=tok',
    );
  });

  it('rewrites http -> ws for plain LAN servers', () => {
    expect(wsUrlFor('http://10.0.0.5:8000', 'abc', 't')).toBe(
      'ws://10.0.0.5:8000/ws/chat/abc?token=t',
    );
  });

  it('url-encodes the token query parameter', () => {
    const token = 'a b/c+d=';
    const url = wsUrlFor('https://x', 'id', token);
    expect(url).toContain(`token=${encodeURIComponent(token)}`);
    expect(url).not.toContain(' ');
  });
});

describe('normalizeMessage', () => {
  const base: RawMessage = { id: 'm1', role: 'user', content: 'hi' };

  it('classifies a plain user message', () => {
    const out = normalizeMessage(base);
    expect(out.role).toBe('user');
    expect(out.agentName).toBeNull();
  });

  it('classifies an assistant message when agent_id is present', () => {
    const out = normalizeMessage({ ...base, role: 'user', agent_id: 'a1', agent_name: 'Atlas' });
    expect(out.role).toBe('assistant');
    expect(out.agentName).toBe('Atlas');
  });

  it('classifies an assistant message by role even without an agent', () => {
    const out = normalizeMessage({ ...base, role: 'assistant', content: 'yo' });
    expect(out.role).toBe('assistant');
  });

  it('keeps system role for non-agent system messages', () => {
    const out = normalizeMessage({ ...base, role: 'system', content: 'note' });
    expect(out.role).toBe('system');
  });

  it('prefers tg_user_display over user_name for the display name', () => {
    const out = normalizeMessage({
      ...base,
      user_name: 'login',
      metadata_: { tg_user_display: 'Telegram Bob' },
    });
    expect(out.userName).toBe('Telegram Bob');
  });

  it('falls back to user_name when no tg display name', () => {
    const out = normalizeMessage({ ...base, user_name: 'Alice' });
    expect(out.userName).toBe('Alice');
  });

  it('passes through metadata only when metadata_ exists', () => {
    expect(normalizeMessage(base).metadata).toBeUndefined();
    const out = normalizeMessage({ ...base, metadata_: { model: 'claude' } });
    expect(out.metadata).toEqual(expect.objectContaining({ model: 'claude' }));
  });
});

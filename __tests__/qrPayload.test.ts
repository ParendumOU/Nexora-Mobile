// The QR pairing payload is a JSON string { url, code }. link.tsx parses it in
// onScan(). This locks the parse contract: only objects carrying BOTH url and
// code are accepted; everything else is rejected as "not a Nexora pairing code".
//
// Mirrors the exact predicate used in app/link.tsx onScan().
function parseQrPayload(data: string): { url: string; code: string } | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed?.url && parsed?.code) {
      return { url: String(parsed.url), code: String(parsed.code) };
    }
    return null;
  } catch {
    return null;
  }
}

describe('QR pairing payload parse contract', () => {
  it('accepts a well-formed { url, code } payload', () => {
    const data = JSON.stringify({ url: 'https://nexora.local', code: 'ABCD2345' });
    expect(parseQrPayload(data)).toEqual({ url: 'https://nexora.local', code: 'ABCD2345' });
  });

  it('coerces non-string url/code to strings', () => {
    const data = JSON.stringify({ url: 'https://x', code: 1234 });
    expect(parseQrPayload(data)).toEqual({ url: 'https://x', code: '1234' });
  });

  it('rejects a payload missing the code', () => {
    expect(parseQrPayload(JSON.stringify({ url: 'https://x' }))).toBeNull();
  });

  it('rejects a payload missing the url', () => {
    expect(parseQrPayload(JSON.stringify({ code: 'ABCD' }))).toBeNull();
  });

  it('rejects an empty url or code (falsy)', () => {
    expect(parseQrPayload(JSON.stringify({ url: '', code: 'ABCD' }))).toBeNull();
    expect(parseQrPayload(JSON.stringify({ url: 'https://x', code: '' }))).toBeNull();
  });

  it('rejects a non-Nexora QR (arbitrary text / URL)', () => {
    expect(parseQrPayload('https://example.com')).toBeNull();
    expect(parseQrPayload('hello world')).toBeNull();
  });

  it('rejects malformed JSON without throwing', () => {
    expect(() => parseQrPayload('{ not json')).not.toThrow();
    expect(parseQrPayload('{ not json')).toBeNull();
  });
});

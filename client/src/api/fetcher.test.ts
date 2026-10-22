import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveApiUrl, waslFetch } from './fetcher';

const authMocks = vi.hoisted(() => ({ getCurrentAccessToken: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ getCurrentAccessToken: authMocks.getCurrentAccessToken }));

describe('resolveApiUrl', () => {
  it('uses the same-origin API path when no API origin is configured', () => {
    expect(resolveApiUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('joins an explicitly configured API origin without duplicate slashes', () => {
    expect(resolveApiUrl('/api/v1/health', 'https://api.example.test/')).toBe(
      'https://api.example.test/api/v1/health',
    );
  });
});

describe('waslFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    authMocks.getCurrentAccessToken.mockReset();
  });

  it('sends the current Supabase session token as a bearer credential', async () => {
    authMocks.getCurrentAccessToken.mockResolvedValue('session-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await waslFetch('/api/v1/profile');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer session-token');
  });
});

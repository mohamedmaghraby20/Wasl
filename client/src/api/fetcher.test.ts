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

  it('preserves structured API error details', async () => {
    authMocks.getCurrentAccessToken.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: 'Already exists' }),
    }));
    await expect(waslFetch('/api/v1/profile')).rejects.toMatchObject({
      name: 'ApiError', status: 409, message: 'Already exists', body: { message: 'Already exists' },
    });
  });

  it('aborts requests after the request timeout', async () => {
    authMocks.getCurrentAccessToken.mockResolvedValue(undefined);
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = waslFetch('/api/v1/profile');
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    vi.useRealTimers();
  });
});

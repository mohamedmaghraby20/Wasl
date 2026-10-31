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
    vi.useRealTimers();
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

  it.each([
    '/api/v1/communities?pageSize=3',
    '/api/v1/communities/language-circle',
    '/api/v1/communities/language-circle/topics',
    '/api/v1/communities/language-circle/topics/topic-1?page=2',
    '/api/v1/events',
    '/api/v1/events/event-1',
    '/api/v1/events/event-1/discussion',
    '/api/v1/reference/cities',
    '/api/v1/reference/categories',
    '/api/v1/organizations/local-association',
    '/api/v1/users/00000000-0000-4000-8000-000000000001',
    '/api/v1/health/ready',
  ])('fetches public data without waiting for a session: %s', async (url) => {
    authMocks.getCurrentAccessToken.mockReturnValue(new Promise(() => {}));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await waslFetch(url);
    expect(authMocks.getCurrentAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['/api/v1/communities/mine', 'GET'],
    ['/api/v1/organizations/mine', 'GET'],
    ['/api/v1/users/me', 'GET'],
    ['/api/v1/users/search?q=member', 'GET'],
    ['/api/v1/communities/community-1/members', 'GET'],
    ['/api/v1/events/event-1/registration', 'GET'],
    ['/api/v1/communities', 'POST'],
    ['/api/v1/communities/community-1', 'DELETE'],
    ['/api/v1/events/event-1/discussion', 'POST'],
  ])('keeps authentication on protected requests: %s %s', async (url, method) => {
    authMocks.getCurrentAccessToken.mockResolvedValue('session-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    await waslFetch(url, { method });
    expect(authMocks.getCurrentAccessToken).toHaveBeenCalledOnce();
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers)
      .get('Authorization')).toBe('Bearer session-token');
  });

  it('does not wait for a session when an explicit credential is supplied', async () => {
    authMocks.getCurrentAccessToken.mockReturnValue(new Promise(() => {}));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    await waslFetch('/api/v1/users/me', { headers: { Authorization: 'Bearer explicit' } });
    expect(authMocks.getCurrentAccessToken).not.toHaveBeenCalled();
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers)
      .get('Authorization')).toBe('Bearer explicit');
  });

  it('times out while waiting for a session before any network request', async () => {
    vi.useFakeTimers();
    authMocks.getCurrentAccessToken.mockReturnValue(new Promise(() => {}));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const rejection = expect(waslFetch('/api/v1/users/me')).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels a pending session wait when the caller aborts', async () => {
    authMocks.getCurrentAccessToken.mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const rejection = expect(waslFetch('/api/v1/users/me', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    expect(fetchMock).not.toHaveBeenCalled();
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

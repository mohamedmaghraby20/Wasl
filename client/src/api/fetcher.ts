export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function resolveApiUrl(url: string, baseUrl?: string): string {
  const apiUrl = baseUrl?.trim().replace(/\/+$/, '') ?? '';
  const apiPath = url.startsWith('/') ? url : `/${url}`;
  return `${apiUrl}${apiPath}`;
}

export async function waslFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const runtimeEnv = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env;
  const headers = new Headers(options?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const controller = new AbortController();
  const signal = options?.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  let abortSession: (() => void) | undefined;
  try {
    signal.throwIfAborted();
    if (!headers.has('Authorization') && !isPublicRead(url, options?.method)) {
      const accessToken = await Promise.race([
        getCurrentAccessToken(),
        new Promise<never>((_resolve, reject) => {
          abortSession = () => reject(
            signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'),
          );
          signal.addEventListener('abort', abortSession, { once: true });
        }),
      ]);
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    }
    response = await fetch(resolveApiUrl(url, runtimeEnv.VITE_API_URL), {
      ...options,
      headers,
      signal,
    });
  } finally {
    window.clearTimeout(timeout);
    if (abortSession) signal.removeEventListener('abort', abortSession);
  }
  if (!response.ok) {
    let body: unknown;
    let message = `Request failed with ${response.status}`;
    try {
      body = await response.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const detail = (body as { message: unknown }).message;
        if (typeof detail === 'string') message = detail;
        else if (Array.isArray(detail)) message = detail.filter((item) => typeof item === 'string').join(', ');
      }
    } catch {
      // Some failures have an empty or non-JSON response body.
    }
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function isPublicRead(url: string, method = 'GET'): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  const path = url.split(/[?#]/)[0]!;
  return [
    /^\/api\/v1\/health(?:\/ready)?$/,
    /^\/api\/v1\/reference\/(?:cities|categories)$/,
    /^\/api\/v1\/communities(?:\/(?!mine$)[^/]+(?:\/topics(?:\/[^/]+)?)?)?$/,
    /^\/api\/v1\/events(?:\/[^/]+(?:\/discussion)?)?$/,
    /^\/api\/v1\/organizations\/(?!mine$)[^/]+$/,
    /^\/api\/v1\/users\/[0-9a-f-]{36}$/i,
  ].some((pattern) => pattern.test(path));
}
import { getCurrentAccessToken } from '@/lib/supabase';

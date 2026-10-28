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
  const accessToken = await getCurrentAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(resolveApiUrl(url, runtimeEnv.VITE_API_URL), {
      ...options,
      headers,
      signal: options?.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
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
import { getCurrentAccessToken } from '@/lib/supabase';

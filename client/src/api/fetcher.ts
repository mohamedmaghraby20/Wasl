export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
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
  const response = await fetch(resolveApiUrl(url, runtimeEnv.VITE_API_URL), {
    ...options,
    headers,
  });
  if (!response.ok) {
    throw new ApiError(`Request failed with ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
import { getCurrentAccessToken } from '@/lib/supabase';

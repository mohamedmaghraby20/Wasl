import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CityPublicDto } from '@/api/generated/wasl-client.schemas';
import { useHomeCity } from './useHomeCity';

const cities: CityPublicDto[] = [
  { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' },
  { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
];
const position: GeolocationPosition = {
  coords: {
    longitude: 28.9784, latitude: 41.0082, accuracy: 5_000,
    altitude: null, altitudeAccuracy: null, heading: null, speed: null,
    toJSON: () => ({}),
  },
  timestamp: Date.now(), toJSON: () => ({}),
};

beforeEach(() => {
  const boundaries: unknown = JSON.parse(readFileSync('public/geo/tr-provinces.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => boundaries }));
});

afterEach(() => {
  localStorage.removeItem('wasl-city');
  vi.unstubAllGlobals();
});

it('automatically resolves a coarse Istanbul fix once, including in Strict Mode', async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { result, rerender } = renderHook(() => useHomeCity(cities), { wrapper: StrictMode });

  await waitFor(() => expect(result.current.cityId).toBe('istanbul'));
  expect(result.current.location).toEqual({ status: 'success', cityId: 'istanbul' });
  expect(getCurrentPosition).toHaveBeenCalledExactlyOnceWith(
    expect.any(Function), expect.any(Function),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
  );
  rerender();
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
});

it('waits for supported cities and preserves a remembered city until a fresh fix arrives', async () => {
  localStorage.setItem('wasl-city', 'ankara');
  let respond: PositionCallback | undefined;
  const getCurrentPosition = vi.fn((success: PositionCallback) => { respond = success; });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { result, rerender } = renderHook(
    ({ reference }: { reference: CityPublicDto[] | undefined }) => useHomeCity(reference),
    { initialProps: { reference: undefined as CityPublicDto[] | undefined } },
  );
  expect(getCurrentPosition).not.toHaveBeenCalled();
  rerender({ reference: cities });
  await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
  expect(result.current.cityId).toBe('ankara');
  act(() => respond?.(position));
  await waitFor(() => expect(result.current.cityId).toBe('istanbul'));
});

it('does not overwrite a manual city with a delayed automatic fix', async () => {
  let respond: PositionCallback | undefined;
  const getCurrentPosition = vi.fn((success: PositionCallback) => { respond = success; });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { result } = renderHook(() => useHomeCity(cities));
  await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
  act(() => result.current.setCityId('ankara'));
  act(() => respond?.(position));
  expect(result.current.cityId).toBe('ankara');
  expect(localStorage.getItem('wasl-city')).toBe('ankara');
});

it('honors manual nationwide selection made before the city reference finishes loading', async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { result, rerender } = renderHook(
    ({ reference }: { reference: CityPublicDto[] | undefined }) => useHomeCity(reference),
    { initialProps: { reference: undefined as CityPublicDto[] | undefined } },
  );
  act(() => result.current.setCityId(''));
  rerender({ reference: cities });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(result.current.cityId).toBe('');
});

it('keeps the remembered city after permission denial without requesting again', async () => {
  localStorage.setItem('wasl-city', 'ankara');
  const getCurrentPosition = vi.fn((_success: PositionCallback, fail: PositionErrorCallback) => {
    fail({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
  });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { result, rerender } = renderHook(() => useHomeCity(cities));
  await waitFor(() => expect(result.current.location).toEqual({ status: 'error', error: 'denied' }));
  expect(result.current.cityId).toBe('ankara');
  rerender();
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
});

it('ignores an automatic fix after leaving the home page', async () => {
  let respond: PositionCallback | undefined;
  const getCurrentPosition = vi.fn((success: PositionCallback) => { respond = success; });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const { unmount } = renderHook(() => useHomeCity(cities));
  await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
  unmount();
  act(() => respond?.(position));
  expect(localStorage.getItem('wasl-city')).toBeNull();
});

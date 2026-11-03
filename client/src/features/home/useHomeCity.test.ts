import { readFileSync } from 'node:fs';
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useHomeCity } from './useHomeCity';

afterEach(() => {
  localStorage.removeItem('wasl-city');
  vi.unstubAllGlobals();
});

it('requests an accurate fix so a coarse Istanbul location does not fail city matching', async () => {
  const boundaries: unknown = JSON.parse(readFileSync('public/geo/tr-provinces.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => boundaries }));
  const getCurrentPosition = vi.fn((success: PositionCallback, _error: PositionErrorCallback, options: PositionOptions) => {
    success({
      coords: {
        longitude: 28.9784, latitude: 41.0082,
        accuracy: options.enableHighAccuracy ? 20 : 5_000,
        altitude: null, altitudeAccuracy: null, heading: null, speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(), toJSON: () => ({}),
    });
  });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  const cities = [{ id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' }];
  const { result } = renderHook(() => useHomeCity(cities));

  act(() => result.current.requestLocation());

  await waitFor(() => expect(result.current.cityId).toBe('istanbul'));
  expect(result.current.location).toEqual({ status: 'success', cityId: 'istanbul' });
});

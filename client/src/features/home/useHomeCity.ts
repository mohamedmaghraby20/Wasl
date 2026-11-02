import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityPublicDto } from '@/api/generated/wasl-client.schemas';
import { loadProvinceBoundaries, resolveProvinceCity } from './province-boundaries';

const storageKey = 'wasl-city';
const geolocationTimeout = 10_000;

export type LocationError =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unmatched'
  | 'boundaries'
  | 'cities';

export type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'resolving' }
  | { status: 'success'; cityId: string }
  | { status: 'error'; error: LocationError };

function rememberedCity(): string {
  try {
    return window.localStorage.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
}

// Manual selection and explicit location resolution commit through the same setter.
export function useHomeCity(cities: CityPublicDto[] | undefined) {
  const [candidate, setCandidate] = useState(rememberedCity);
  const [cityId, setCity] = useState('');
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const generation = useRef(0);

  const setCityId = useCallback((value: string): void => {
    generation.current += 1;
    setCandidate('');
    setLocation({ status: 'idle' });
    setCity(value);
    try {
      if (value) window.localStorage.setItem(storageKey, value);
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* Discovery remains usable without browser persistence. */
    }
  }, []);

  const requestLocation = useCallback((): void => {
    const request = ++generation.current;
    const stale = () => request !== generation.current;
    if (!cities) {
      setLocation({ status: 'error', error: 'cities' });
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation({ status: 'error', error: 'unsupported' });
      return;
    }
    if (window.isSecureContext === false) {
      setLocation({ status: 'error', error: 'insecure' });
      return;
    }
    setLocation({ status: 'locating' });
    const fail = (error: LocationError): void => {
      if (!stale()) setLocation({ status: 'error', error });
    };
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (stale()) return;
          const { longitude, latitude, accuracy } = position.coords;
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
            fail('unavailable');
            return;
          }
          setLocation({ status: 'resolving' });
          void loadProvinceBoundaries()
            .then((provinces) => {
              if (stale()) return;
              const resolved = resolveProvinceCity(provinces, longitude, latitude, accuracy);
              if (!resolved || !cities.some((city) => city.id === resolved)) {
                fail('unmatched');
                return;
              }
              setCityId(resolved);
              setLocation({ status: 'success', cityId: resolved });
            })
            .catch(() => fail('boundaries'));
        },
        (positionError) => {
          if (positionError.code === 1) fail('denied');
          else if (positionError.code === 3) fail('timeout');
          else fail('unavailable');
        },
        { enableHighAccuracy: false, maximumAge: 0, timeout: geolocationTimeout },
      );
    } catch {
      fail('unavailable');
    }
  }, [cities, setCityId]);

  useEffect(() => {
    if (cities && candidate) {
      setCityId(cities.some((city) => city.id === candidate) ? candidate : '');
      return;
    }
    if (cities && cityId && !cities.some((city) => city.id === cityId)) setCityId('');
  }, [cities, candidate, cityId, setCityId]);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  return {
    cityId,
    setCityId,
    selectedCity: cities?.find((city) => city.id === cityId),
    location,
    requestLocation,
  };
}

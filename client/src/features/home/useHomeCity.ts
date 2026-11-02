import { useEffect, useState } from 'react';
import type { CityPublicDto } from '@/api/generated/wasl-client.schemas';

const storageKey = 'wasl-city';

function rememberedCity(): string {
  try {
    return window.localStorage.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
}

// Manual selection and explicit location resolution commit through the same setter.
export function useHomeCity(cities: CityPublicDto[] | undefined) {
  const [cityId, setCity] = useState(rememberedCity);
  const setCityId = (value: string): void => {
    setCity(value);
    try {
      if (value) window.localStorage.setItem(storageKey, value);
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* Discovery remains usable without browser persistence. */
    }
  };
  useEffect(() => {
    if (cities && cityId && !cities.some((city) => city.id === cityId)) setCityId('');
  }, [cities, cityId]);
  return { cityId, setCityId, selectedCity: cities?.find((city) => city.id === cityId) };
}

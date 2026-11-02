import { ArrowRight, Eye, LocateFixed } from 'lucide-react';
import { useState } from 'react';
import { Form, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { QueryError } from '@/components/feedback/QueryError';
import { localizedName } from '@/features/resources/resource-utils';
import { HomeSection } from './HomeSection';
import { HomeInterests } from './HomeInterests';
import { useHomeCity } from './useHomeCity';
import type { LocationError } from './useHomeCity';
import {
  useDiscoveryControllerListCommunities,
  useDiscoveryControllerListEvents,
  useDiscoveryControllerCities,
} from '@/api/generated/discovery/discovery';

const locationErrorKeys: Record<LocationError, string> = {
  unsupported: 'locationUnsupported',
  insecure: 'locationInsecure',
  denied: 'locationDenied',
  unavailable: 'locationUnavailable',
  timeout: 'locationTimeout',
  unmatched: 'locationUnmatched',
  boundaries: 'locationBoundariesError',
  cities: 'locationCitiesError',
};

export function HomePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const lang: 'ar' | 'en' = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const cities = useDiscoveryControllerCities();
  const { cityId, setCityId, selectedCity, location, requestLocation } = useHomeCity(cities.data);
  const cityName = selectedCity ? localizedName(selectedCity, i18n.language) : cityId;
  const locationBusy = location.status === 'locating' || location.status === 'resolving';
  const locationError = location.status === 'error' ? locationErrorKeys[location.error] : undefined;
  const communities = useDiscoveryControllerListCommunities({ pageSize: 3, lang });
  const eventFilters = {
    pageSize: 4,
    lang,
    modality: 'in-person' as const,
    upcoming: true,
    nonCancelled: true,
  };
  const localEvents = useDiscoveryControllerListEvents({
    ...eventFilters,
    ...(cityId ? { city: cityId } : {}),
  });
  const fallback = Boolean(cityId && localEvents.isSuccess && localEvents.data.items.length === 0);
  const nationwideEvents = useDiscoveryControllerListEvents(eventFilters, {
    query: { enabled: fallback },
  });
  const events = fallback ? nationwideEvents : localEvents;
  const eventDestination = new URLSearchParams({
    modality: 'in-person',
    upcoming: 'true',
    nonCancelled: 'true',
    ...(!fallback && cityId ? { city: cityId } : {}),
  });
  const onlineEvents = useDiscoveryControllerListEvents({
    pageSize: 4,
    lang,
    modality: 'online',
    upcoming: true,
    nonCancelled: true,
  });
  const onlineDestination = new URLSearchParams({
    modality: 'online',
    upcoming: 'true',
    nonCancelled: 'true',
  });
  const onlineEmpty = onlineEvents.isSuccess && onlineEvents.data.items.length === 0;
  useSeoMeta({
    title: t('welcome'),
    description: t('starter'),
    ogTitle: t('welcome'),
    ogDescription: t('starter'),
    ogType: 'website',
  });
  return (
    <div className="grid gap-12">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-primary/20 bg-primary-soft">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-28 -top-28 size-80 rounded-full border border-primary/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-6 top-16 size-48 rounded-full border border-primary/25"
        />
        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:p-12">
          <div className="grid content-center gap-5">
            <h1 className="max-w-[16ch] font-heading text-[length:var(--font-size-display)] font-extrabold rtl:max-w-[24ch]">
              {t('welcome')}
            </h1>
            <p className="max-w-(--container-reading) text-base leading-relaxed text-text-muted">
              {t('starter')}
            </p>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <Button asChild>
                <Link to="/communities">
                  {t('browseCommunities')}
                  <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/events">{t('browseEvents')}</Link>
              </Button>
            </div>
            <p className="inline-flex items-center gap-2 text-xs font-medium text-text-subtle">
              <Eye aria-hidden="true" className="size-4" />
              {t('browseWithoutSignIn')}
            </p>
          </div>

          <Form
            action="/discover"
            aria-label={t('homeSearchLabel')}
            className="grid gap-3 rounded-(--shape-radius-xl) border border-border bg-card p-5 shadow-md sm:p-6"
            method="get"
            role="search"
          >
            <label className="text-sm font-semibold text-text" htmlFor="home-search">
              {t('homeSearchLabel')}
            </label>
            <SearchInput
              aria-label={t('homeSearchLabel')}
              id="home-search"
              name="q"
              onValueChange={setQuery}
              placeholder={t('exploreByName')}
              value={query}
            />
            <input type="hidden" name="upcoming" value="true" />
            <input type="hidden" name="nonCancelled" value="true" />
            <input type="hidden" name="cityScope" value="include-online" />
            {cityId ? <input type="hidden" name="city" value={cityId} /> : null}
            <SearchableSelect
              aria-label={cityId ? `${t('cityFilter')}: ${cityName}` : t('nationwide')}
              aria-busy={cities.isPending}
              disabled={cities.isPending || cities.isError || !cities.data}
              emptyMessage={t('noCitiesFound')}
              id="home-city"
              onValueChange={setCityId}
              options={[
                { value: '', label: t('nationwide') },
                ...(cities.data ?? []).map((city) => ({
                  value: city.id,
                  label: localizedName(city, i18n.language),
                })),
              ]}
              placeholder={
                cities.isPending ? t('loadingCities') : cityId ? cityName : t('nationwide')
              }
              searchPlaceholder={t('searchCities')}
              value={cityId}
            />
            {cities.isError ? (
              <QueryError message={t('homeCitiesError')} onRetry={() => void cities.refetch()} />
            ) : null}
            <div className="grid gap-2">
              <IconButton
                aria-describedby="home-location-privacy"
                disabled={!cities.data}
                icon={LocateFixed}
                label={t('useMyLocation')}
                onClick={requestLocation}
                type="button"
                variant="secondary"
              />
              {locationBusy ? (
                <p className="text-xs font-medium text-text-muted" role="status">
                  {t('locatingCity')}
                </p>
              ) : location.status === 'success' ? (
                <p className="text-xs font-medium text-success" role="status">
                  {t('locationSuccess', { city: cityName })}
                </p>
              ) : locationError ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {t(locationError)}
                </p>
              ) : null}
              <p id="home-location-privacy" className="text-xs text-text-muted">
                {t('locationPrivacy')}
              </p>
              <a
                className="w-fit text-[0.6875rem] text-text-subtle underline decoration-border underline-offset-2 hover:text-primary-soft-text focus-visible:text-primary-soft-text"
                href="https://creativecommons.org/licenses/by/4.0/"
              >
                {t('locationAttribution')}
              </a>
            </div>
            <Button block type="submit">
              {t('search')}
            </Button>
          </Form>
        </div>
      </section>

      <HomeSection
        title={
          cityId && !fallback
            ? t('upcomingEventsInCity', { city: cityName })
            : t('upcomingEventsNationwide')
        }
        kind="events"
        language={i18n.language}
        items={events.data?.items}
        isPending={events.isPending}
        isError={events.isError}
        onRetry={() => void events.refetch()}
        viewAll={`/events?${eventDestination}`}
      />
      <HomeSection
        title={t('communities')}
        kind="communities"
        language={i18n.language}
        items={communities.data?.items}
        isPending={communities.isPending}
        isError={communities.isError}
        onRetry={() => void communities.refetch()}
      />
      {!onlineEmpty && (
        <HomeSection
          title={t('upcomingOnlineEvents')}
          kind="events"
          sectionId="online-events"
          language={i18n.language}
          items={onlineEvents.data?.items}
          isPending={onlineEvents.isPending}
          isError={onlineEvents.isError}
          onRetry={() => void onlineEvents.refetch()}
          viewAll={`/events?${onlineDestination}`}
        />
      )}
      <HomeInterests cityId={cityId} />
    </div>
  );
}

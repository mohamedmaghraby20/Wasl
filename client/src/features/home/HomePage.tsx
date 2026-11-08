import { useState } from 'react';
import { Form, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { QueryError } from '@/components/feedback/QueryError';
import { localizedName } from '@/features/resources/resource-utils';
import { useAuth } from '@/features/auth/AuthProvider';
import { HomeSection } from './HomeSection';
import { HomeInterests } from './HomeInterests';
import { PersonalSidebar } from './PersonalSidebar';
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
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const lang: 'ar' | 'en' = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const cities = useDiscoveryControllerCities();
  const { cityId, restoringCity, setCityId, selectedCity, location } = useHomeCity(cities.data);
  const cityReady = !restoringCity || cities.isError;
  const cityName = selectedCity ? localizedName(selectedCity, i18n.language) : cityId;
  const locationBusy = location.status === 'locating' || location.status === 'resolving';
  const locationError = location.status === 'error' ? locationErrorKeys[location.error] : undefined;
  const communityFilters = { pageSize: 4, lang, order: 'member-count' as const };
  const localCommunities = useDiscoveryControllerListCommunities(
    { ...communityFilters, ...(cityId ? { city: cityId } : {}) },
    { query: { enabled: cityReady } },
  );
  const communityFallback = Boolean(
    cityId && localCommunities.isSuccess && localCommunities.data.items.length === 0,
  );
  const nationwideCommunities = useDiscoveryControllerListCommunities(communityFilters, {
    query: { enabled: communityFallback },
  });
  const communities = communityFallback ? nationwideCommunities : localCommunities;
  const communityDestination = new URLSearchParams({
    order: 'member-count',
    ...(!communityFallback && cityId ? { city: cityId } : {}),
  });
  const eventFilters = {
    pageSize: 4,
    lang,
    modality: 'in-person' as const,
    upcoming: true,
    nonCancelled: true,
  };
  const localEvents = useDiscoveryControllerListEvents(
    { ...eventFilters, ...(cityId ? { city: cityId } : {}) },
    { query: { enabled: cityReady } },
  );
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
    <div
      className={`grid min-w-0 gap-8 sm:gap-10 ${user ? 'xl:grid-cols-[clamp(18rem,24vw,26rem)_minmax(0,1fr)] xl:items-start xl:gap-x-12' : ''}`}
    >
      <section
        aria-labelledby="home-hero-heading"
        className={`relative isolate order-1 overflow-hidden rounded-(--shape-radius-2xl) border border-border bg-[radial-gradient(ellipse_at_88%_22%,var(--color-primary-soft),transparent_44%),linear-gradient(135deg,var(--color-surface),var(--color-surface-soft))] shadow-(--shadow-card) ${user ? 'xl:col-start-2' : ''}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute end-[-5rem] top-20 size-72 rounded-full border border-primary/30 sm:size-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute end-[-2rem] top-32 size-48 rounded-full border border-primary/30 sm:size-56"
        />
        <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-extrabold text-text">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-(--shape-radius-md) bg-primary text-base text-primary-foreground"
              >
                w
              </span>
              <span>{t('brand')}</span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-muted">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
              {t('homeHeroTag')}
            </span>
          </div>
          <div className="grid max-w-2xl content-start gap-3">
            <p className="text-xs font-bold tracking-wide text-text-muted">
              {t('homeHeroEyebrow')}
            </p>
            <h1
              id="home-hero-heading"
              className="max-w-[15ch] font-heading text-4xl font-extrabold leading-[1.1] sm:text-5xl rtl:max-w-[20ch] rtl:leading-[1.3]"
            >
              {t('homeHeroTitle')}
            </h1>
            <p className="max-w-(--container-reading) text-base leading-relaxed text-text-muted sm:text-lg">
              {t('homeHeroDescription')}
            </p>
          </div>

          <Form
            action="/discover"
            aria-label={t('homeSearchLabel')}
            className="grid w-full max-w-2xl min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3"
            method="get"
            role="search"
          >
            <div className="col-span-2">
              <SearchInput
                aria-label={t('homeSearchLabel')}
                id="home-search"
                name="q"
                onValueChange={setQuery}
                placeholder={t('homeSearchLabel')}
                value={query}
              />
            </div>
            <input type="hidden" name="upcoming" value="true" />
            <input type="hidden" name="nonCancelled" value="true" />
            <input type="hidden" name="cityScope" value="include-online" />
            {cityId ? <input type="hidden" name="city" value={cityId} /> : null}
            <SearchableSelect
              aria-label={cityId ? `${t('cityFilter')}: ${cityName}` : t('nationwide')}
              aria-busy={cities.isPending}
              className="col-span-2 sm:col-span-1"
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
            <Button className="col-span-2 sm:col-span-1" type="submit">
              {t('search')}
            </Button>
            <div className="col-span-2 grid gap-1 empty:hidden">
              {cities.isError ? (
                <QueryError message={t('homeCitiesError')} onRetry={() => void cities.refetch()} />
              ) : null}
              {locationBusy ? (
                <p className="text-xs font-medium text-text-muted" role="status">
                  {t('locatingCity')}
                </p>
              ) : locationError ? (
                <p className="text-xs text-text-muted" role="status">
                  {t(locationError)}
                </p>
              ) : null}
            </div>
          </Form>
        </div>
      </section>

      {user ? (
        <div className="order-2 min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-3">
          <PersonalSidebar />
        </div>
      ) : null}
      <div className={`order-3 grid min-w-0 gap-8 sm:gap-10 ${user ? 'xl:col-start-2' : ''}`}>
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
          title={
            cityId && !communityFallback
              ? t('communitiesInCity', { city: cityName })
              : t('communitiesNationwide')
          }
          kind="communities"
          language={i18n.language}
          items={communities.data?.items}
          isPending={communities.isPending}
          isError={communities.isError}
          onRetry={() => void communities.refetch()}
          viewAll={`/communities?${communityDestination}`}
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
      {!authLoading && !user ? (
        <section
          aria-labelledby="home-signup-heading"
          className="order-4 flex flex-wrap items-center justify-between gap-4 rounded-(--shape-radius-xl) bg-primary-soft p-5 sm:p-6"
        >
          <div className="grid gap-2">
            <h2 id="home-signup-heading" className="text-xl font-bold sm:text-2xl">
              {t('homeSignupTitle')}
            </h2>
            <p className="max-w-prose text-sm text-text-muted">{t('homeSignupDescription')}</p>
          </div>
          <Button asChild>
            <Link to="/sign-up?returnTo=%2F">{t('authCreateAccount')}</Link>
          </Button>
        </section>
      ) : null}
      <section
        aria-labelledby="home-create-heading"
        className={`order-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 ${user ? 'xl:col-start-2' : ''}`}
      >
        <div className="grid gap-2">
          <h2 id="home-create-heading" className="text-xl font-bold sm:text-2xl">
            {t('homeCreateTitle')}
          </h2>
          <p className="max-w-prose text-sm text-text-muted">{t('homeCreateDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/create/event">{t('createEventTitle')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/create/community">{t('createCommunityTitle')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

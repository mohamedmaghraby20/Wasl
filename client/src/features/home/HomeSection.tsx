import { ArrowRight, ChevronLeft, ChevronRight, MapPin, SearchX, Ticket, UsersRound } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { useDiscoveryControllerListEvents } from '@/api/generated/discovery/discovery';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconButton } from '@/components/ui/IconButton';
import { HomeCompactEventCard } from './HomeCompactEventCard';
import { ResourceCard } from '@/features/resources/ResourceCard';
import { QueryError } from '@/components/feedback/QueryError';
import { localizedResourceTitle, turkeyDateParts, type ResourceKind } from '@/features/resources/resource-utils';

export function HomeSection({
  title,
  kind,
  language,
  items,
  isPending,
  isError,
  onRetry,
  viewAll,
  sectionId = kind,
  compactEvents = false,
  ranked = false,
  offsetShadow = false,
  total,
}: {
  title: string;
  kind: ResourceKind;
  language: string;
  items: (CommunityPublicDto | EventPublicDto)[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  viewAll?: string;
  sectionId?: string;
  compactEvents?: boolean;
  ranked?: boolean;
  offsetShadow?: boolean;
  total?: number | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const resource = title.toLocaleLowerCase(language);
  const isEventList = kind === 'events' && !compactEvents;
  const row = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ overflow: false, start: true, end: false });
  const rtl = language.startsWith('ar');
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const measure = (): void => {
      const offset = Math.abs(element.scrollLeft);
      const maximum = element.scrollWidth - element.clientWidth;
      setPosition({ overflow: maximum > 1, start: offset < 1, end: offset >= maximum - 1 });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    element.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      element.removeEventListener('scroll', measure);
    };
  }, [items, isPending, isError, language]);
  const move = (forward: boolean): void => {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: element.clientWidth * (forward ? 1 : -1) * (rtl ? -1 : 1) });
  };
  const rowClass = isEventList
    ? 'grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3'
    : compactEvents
      ? 'grid min-w-0 grid-flow-col auto-cols-[70%] gap-3 overflow-x-auto overscroll-x-contain p-1 -m-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden @sm:auto-cols-[calc((100%-0.75rem)/2)] @xl:auto-cols-[calc((100%-1.5rem)/3)] @min-[42rem]:auto-cols-[calc((100%-2.25rem)/4)] @min-[54rem]:auto-cols-[calc((100%-3rem)/5)]'
      : 'grid min-w-0 grid-flow-col auto-cols-[85%] gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1 -m-1 sm:auto-cols-[calc((100%-1rem)/2)] xl:auto-cols-[calc((100%-2rem)/3)]';
  return (
    <section
      className={compactEvents ? '@container grid min-w-0 gap-4' : 'grid gap-4'}
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="grid gap-1 sm:flex sm:items-end sm:justify-between sm:gap-3">
        <div className="grid gap-1">
          <h2 className="text-xl font-bold sm:text-2xl" id={`${sectionId}-heading`}>
            {title}
          </h2>
          {total !== undefined && total > 0 ? (
            <p className="text-sm text-text-muted">
              {t('homeEventTotal', { count: total, formattedCount: new Intl.NumberFormat(language).format(total) })}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2">
          {!isEventList && position.overflow && !isPending && !isError && items?.length ? (
            <div className="flex gap-2">
              <IconButton
                aria-controls={`${sectionId}-cards`}
                disabled={position.start}
                icon={rtl ? ChevronRight : ChevronLeft}
                label={t('homePreviousCards')}
                onClick={() => move(false)}
                variant="secondary"
              />
              <IconButton
                aria-controls={`${sectionId}-cards`}
                disabled={position.end}
                icon={rtl ? ChevronLeft : ChevronRight}
                label={t('homeNextCards')}
                onClick={() => move(true)}
                variant="secondary"
              />
            </div>
          ) : null}
          <Link
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-sm font-semibold text-primary-soft-text hover:underline ${compactEvents ? '' : 'sm:me-28'}`}
            to={viewAll ?? `/${kind}`}
          >
            {t('exploreAll')}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
      {isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('loading', { resource })}
          </p>
          <div aria-hidden="true" className={rowClass}>
            {Array.from({ length: compactEvents ? 5 : 4 }, (_, index) =>
              compactEvents ? (
                <div className="grid gap-2" key={index}>
                  <Skeleton className="aspect-video" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : (
                <div
                  className={`flex flex-col gap-2 rounded-(--shape-radius-card) border border-border bg-card p-4 ${kind === 'events' ? '' : 'min-h-[18rem]'}`}
                  key={index}
                >
                  <Skeleton
                    className={`-mx-4 -mt-4 rounded-b-none rounded-t-(--shape-radius-card) ${isEventList ? 'h-(--event-cover-height)' : 'aspect-video'}`}
                  />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="mt-auto grid gap-2 border-t border-border pt-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                </div>
              ),
            )}
          </div>
        </>
      ) : isError ? (
        <QueryError message={t('loadError', { resource })} onRetry={onRetry} />
      ) : !items?.length ? (
        <EmptyState
          description={t('noHomeResults', { resource })}
          icon={SearchX}
          title={t('noHomeResultsTitle')}
        />
      ) : ranked ? (
        <ol className="divide-y divide-border border border-border bg-card">
          {items.slice(0, 4).map((item, index) => (
            <li key={item.id}>
              <Link
                className="flex min-h-16 min-w-0 items-center gap-3 p-3 transition-colors hover:bg-primary-soft sm:gap-4 sm:p-4"
                to={`/communities/${item.slug}`}
              >
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center bg-primary-soft text-sm font-bold tabular-nums text-primary-soft-text">
                  {new Intl.NumberFormat(language, { minimumIntegerDigits: 2 }).format(index + 1)}
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="wrap-anywhere font-semibold">{localizedResourceTitle(item)}</span>
                  {item.cityName ? <span className="text-xs text-text-muted">{item.cityName}</span> : null}
                </span>
                {'memberCount' in item ? (
                  <span className="flex items-center gap-1.5 text-end text-sm text-text-muted">
                    <UsersRound aria-hidden="true" className="size-4 shrink-0" />
                    {t('communityMemberCount', { count: item.memberCount })}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div
          aria-label={isEventList ? undefined : t('homeBrowseCards', { resource: title })}
          className={`${rowClass} rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2`}
          id={`${sectionId}-cards`}
          ref={isEventList ? undefined : row}
          role={isEventList ? undefined : 'group'}
          tabIndex={isEventList ? undefined : 0}
          onKeyDown={(event) => {
            if (isEventList || event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === (rtl ? 'ArrowLeft' : 'ArrowRight'));
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              event.currentTarget.scrollTo({
                left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth * (rtl ? -1 : 1),
              });
            }
          }}
        >
          {items.slice(0, compactEvents ? 10 : 4).map((item) => (
            <div
              className={
                isEventList
                  ? `min-w-0 self-start ${offsetShadow ? '[&>article]:shadow-(--shadow-card-hover)' : ''}`
                  : compactEvents
                    ? 'min-w-0'
                    : 'min-h-[18rem] min-w-0 [&>article]:h-full'
              }
              key={item.id}
            >
              {compactEvents && 'startsAt' in item ? (
                <HomeCompactEventCard item={item} language={language} />
              ) : (
                <ResourceCard item={item} kind={kind} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** The upcoming Saturday and Sunday, using the same Türkiye dates as discovery. */
function weekendDates(): { from: string; to: string } {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const saturday = new Date(today + 'T00:00:00Z');
  const weekday = saturday.getUTCDay();
  saturday.setUTCDate(saturday.getUTCDate() + (weekday === 0 ? -1 : 6 - weekday));
  const sunday = new Date(saturday);
  sunday.setUTCDate(saturday.getUTCDate() + 1);
  return { from: saturday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

function EventShelf({
  id, title, pending, error, retry, empty, destination, children,
}: {
  id: string;
  title: string;
  pending: boolean;
  error: boolean;
  retry: () => void;
  empty: string;
  destination?: string;
  children: ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id={id} className="text-xl font-bold sm:text-2xl">{title}</h2>
        {destination ? (
          <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-soft-text hover:underline" to={destination}>
            {t('exploreAll')}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        ) : null}
      </div>
      {error ? <QueryError message={t('loadError', { resource: title })} onRetry={retry} /> : pending ? (
        <div role="status">
          <span className="sr-only">{t('loading', { resource: title })}</span>
          <Skeleton className="h-20 w-full" />
        </div>
      ) : children ?? <p className="text-sm text-text-muted">{empty}</p>}
    </section>
  );
}

/** Build signed-in discovery previews from date filters and a shared nationwide listing sample. */
export function HomeEventDiscovery({ cityId, cityReady, lang }: {
  cityId: string;
  cityReady: boolean;
  lang: 'ar' | 'en';
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const dates = weekendDates();
  const filters = { modality: 'in-person', upcoming: true, nonCancelled: true } as const;
  const weekendScope = { ...dates, ...(cityId ? { city: cityId } : {}) };
  const weekend = useDiscoveryControllerListEvents(
    { ...filters, ...weekendScope, lang, pageSize: 4 },
    { query: { enabled: cityReady } },
  );
  const nationwide = useDiscoveryControllerListEvents({ ...filters, lang, pageSize: 48 });
  const items = nationwide.data?.items ?? [];
  const popular = items
    .filter((event) => event.acceptedRegistrationCount > 0)
    .sort((a, b) => b.acceptedRegistrationCount - a.acceptedRegistrationCount)
    .slice(0, 3);
  const limited = items.flatMap((event) => {
    const remaining = event.capacity == null ? 0 : event.capacity - event.acceptedRegistrationCount;
    return remaining > 0 && remaining <= 5 ? [{ event, remaining }] : [];
  }).sort((a, b) => a.remaining - b.remaining).slice(0, 3);
  const otherCities = new Map<string, EventPublicDto>();
  for (const event of items) {
    if (event.cityId && event.cityId !== cityId && event.cityName && !otherCities.has(event.cityId)) {
      otherCities.set(event.cityId, event);
    }
    if (otherCities.size === 4) break;
  }
  const listings = { modality: filters.modality, upcoming: 'true', nonCancelled: 'true' };
  const eventListing = (scope: Record<string, string>): string =>
    '/events?' + new URLSearchParams({ ...listings, ...scope }).toString();
  const nationalState = {
    pending: nationwide.isPending,
    error: nationwide.isError,
    retry: () => void nationwide.refetch(),
  };
  const titleLink = 'min-w-0 wrap-anywhere font-semibold text-text hover:underline';

  return (
    <>
      <EventShelf
        id="home-weekend"
        title={t('homeWeekend')}
        pending={!cityReady || weekend.isPending}
        error={weekend.isError}
        retry={() => void weekend.refetch()}
        empty={t('homeWeekendEmpty')}
        destination={eventListing(weekendScope)}
      >
        {weekend.data?.items.length ? (
          <ul className="divide-y divide-border border border-s-2 border-border border-s-primary bg-surface-soft shadow-(--shadow-card-hover)">
            {weekend.data.items.map((event) => {
              const date = turkeyDateParts(event.startsAt, i18n.language);
              return (
                <li key={event.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3 sm:p-4">
                  <time dateTime={event.startsAt} className="grid min-w-16 justify-items-center bg-primary-soft p-2 text-xs font-semibold text-primary-soft-text">
                    <span>{date.weekday}</span>
                    <span className="text-xl font-bold">{date.day}</span>
                  </time>
                  <div className="grid min-w-0 gap-1">
                    <Link className={titleLink} to={'/events/' + event.slug}>{localizedResourceTitle(event)}</Link>
                    <span className="text-sm text-text-muted">{[date.time, event.cityName].filter(Boolean).join(' · ')}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </EventShelf>
      <EventShelf
        id="home-popular-events"
        title={t('homePopularEvents')}
        empty={t('homePopularEventsEmpty')}
        {...nationalState}
      >
        {popular.length ? (
          <ol className="grid gap-3 sm:grid-cols-3">
            {popular.map((event, index) => (
              <li key={event.id} className="grid content-start gap-3 border border-border bg-card p-4 shadow-(--shadow-card-hover)">
                <span aria-hidden="true" className="text-3xl font-extrabold tabular-nums text-primary-soft-text">
                  {new Intl.NumberFormat(i18n.language, { minimumIntegerDigits: 2 }).format(index + 1)}
                </span>
                <Link className={titleLink} to={'/events/' + event.slug}>{localizedResourceTitle(event)}</Link>
                <span className="flex items-center gap-2 text-sm text-text-muted">
                  <UsersRound aria-hidden="true" className="size-4 shrink-0" />
                  {t('eventRegisteredCount', { count: event.acceptedRegistrationCount })}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </EventShelf>
      <EventShelf
        id="home-limited-events"
        title={t('homeLimitedEvents')}
        empty={t('homeLimitedEventsEmpty')}
        {...nationalState}
      >
        {limited.length ? (
          <ul className="grid gap-2">
            {limited.map(({ event, remaining }) => (
              <li key={event.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch border border-border bg-card">
                <Link className={titleLink + ' flex items-center p-3 sm:p-4'} to={'/events/' + event.slug}>
                  {localizedResourceTitle(event)}
                </Link>
                <span className="flex max-w-40 items-center gap-2 border-s border-dashed border-border bg-primary-soft p-3 text-sm font-semibold text-primary-soft-text">
                  <Ticket aria-hidden="true" className="size-4 shrink-0" />
                  {t('eventPlacesLeft', { count: remaining })}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </EventShelf>
      <EventShelf
        id="home-other-cities"
        title={t(cityId ? 'homeOtherCities' : 'homeExploreCities')}
        empty={t('homeExploreCitiesEmpty')}
        {...nationalState}
      >
        {otherCities.size ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {Array.from(otherCities, ([city, event]) => (
              <li key={city} className="min-w-0">
                <Link className="flex min-h-14 items-center gap-2 border border-border bg-card px-3 py-2 font-semibold text-text hover:border-primary hover:text-primary-soft-text" to={eventListing({ city })}>
                  <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary-soft-text" />
                  <span className="min-w-0 flex-1 wrap-anywhere">{event.cityName}</span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </EventShelf>
    </>
  );
}

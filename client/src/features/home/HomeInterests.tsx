import { CalendarDays, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  useDiscoveryControllerDiscoveryCategories,
  useDiscoveryControllerListEvents,
} from '@/api/generated/discovery/discovery';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import { QueryError } from '@/components/feedback/QueryError';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { localizedName, localizedResourceTitle } from '@/features/resources/resource-utils';

export function HomeInterests({ cityId }: { cityId: string }): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const categories = useDiscoveryControllerDiscoveryCategories(
    cityId ? { city: cityId } : undefined,
  );
  if (categories.isSuccess && categories.data.length === 0) return null;

  return (
    <section aria-labelledby="home-interests-heading" className="grid gap-4">
      <h2 className="text-xl font-bold sm:text-2xl" id="home-interests-heading">
        {t('homeInterests')}
      </h2>
      {categories.isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('loadingCategories')}
          </p>
          <div aria-hidden="true" className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-11 w-28" key={index} />
            ))}
          </div>
        </>
      ) : categories.isError ? (
        <QueryError message={t('homeInterestsError')} onRetry={() => void categories.refetch()} />
      ) : (
        <ul className="flex flex-wrap gap-3">
          {categories.data.map((category) => {
            const destination = new URLSearchParams({
              category: category.id,
              ...(cityId ? { city: cityId } : {}),
              upcoming: 'true',
              nonCancelled: 'true',
              cityScope: 'include-online',
            });
            return (
              <li className="min-w-0 max-w-full" key={category.id}>
                <Button
                  asChild
                  className="h-auto min-h-11 max-w-full whitespace-normal break-words py-2 text-start"
                  variant="outline"
                >
                  <Link to={`/discover?${destination}`}>
                    {localizedName(category, i18n.language)}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const normalize = (text: string): string => text.normalize('NFKC').trim().toLowerCase();

/** Match saved profile tags against upcoming event categories and listing text. */
export function HomeInterestEvents({
  cityId,
  cityReady,
  lang,
}: {
  cityId: string;
  cityReady: boolean;
  lang: 'ar' | 'en';
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const profile = useUsersControllerCurrent({ lang });
  const interests = (profile.data?.interests ?? [])
    .map((label) => ({ label, term: normalize(label) }))
    .filter(({ term }) => term);
  const enabled = interests.length > 0 && cityReady;
  const events = useDiscoveryControllerListEvents(
    {
      lang,
      pageSize: 48,
      upcoming: true,
      nonCancelled: true,
      ...(cityId ? { city: cityId, cityScope: 'include-online' } : {}),
    },
    { query: { enabled } },
  );
  const matches = (enabled ? events.data?.items ?? [] : [])
    .flatMap((event) => {
      const categoryTerms = event.categories.flatMap(({ id, nameAr, nameEn, nameTr }) =>
        [id, nameAr, nameEn, nameTr].map(normalize),
      );
      const description = normalize(`${event.title} ${event.description}`);
      const interest = interests.find(
        ({ term }) => categoryTerms.includes(term) || description.includes(term),
      );
      return interest ? [{ event, interest: interest.label }] : [];
    })
    .slice(0, 3);
  const pending = profile.isPending || (interests.length > 0 && (!cityReady || events.isPending));
  const formatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  });

  return (
    <section aria-labelledby="home-interest-events" className="grid gap-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="home-interest-events"
          className="flex items-center gap-2 text-xl font-bold sm:text-2xl"
        >
          <Sparkles aria-hidden="true" className="size-5 shrink-0 text-primary-soft-text" />
          {t('homeInterestEvents')}
        </h2>
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-soft-text hover:underline"
          to="/profile/edit"
        >
          {t('homeEditInterests')}
        </Link>
      </div>
      {profile.isError || events.isError ? (
        <QueryError
          message={t('homeInterestsError')}
          onRetry={() => void (profile.isError ? profile.refetch() : events.refetch())}
        />
      ) : pending ? (
        <div role="status">
          <span className="sr-only">{t('loading', { resource: t('homeInterestEvents') })}</span>
          <Skeleton className="h-32 w-full" />
        </div>
      ) : matches.length ? (
        <ul className="grid min-w-0 gap-3 md:grid-cols-5">
          {matches.map(({ event, interest }, index) => (
            <li
              className={`min-w-0 ${['md:col-span-3 md:only:col-span-5', 'md:col-span-2', 'md:col-span-5'][index]}`}
              key={event.id}
            >
              <Link
                className={`grid h-full content-start gap-3 border border-border p-4 transition-colors hover:border-primary sm:p-5 ${index === 0 ? 'bg-primary-soft text-primary-soft-text sm:p-6' : 'bg-card text-text'} ${index === 2 ? 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center' : ''}`}
                to={`/events/${event.slug}`}
              >
                {index === 0 ? (
                  <img
                    alt=""
                    className="aspect-[4/1] w-full border border-border object-cover"
                    loading="lazy"
                    src="/images/community-covers/events-abstract.svg"
                  />
                ) : null}
                <div className="grid min-w-0 gap-2">
                  <Badge className="max-w-full justify-self-start wrap-anywhere" variant="outline">
                    {interest}
                  </Badge>
                  <h3 className={`wrap-anywhere font-bold ${index === 0 ? 'text-xl sm:text-2xl' : 'text-base'}`}>
                    {localizedResourceTitle(event)}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
                    <time dateTime={event.startsAt}>{formatter.format(new Date(event.startsAt))}</time>
                  </span>
                  <span>{event.online ? t('online') : event.cityName}</span>
                  <span className="inline-flex items-center gap-2">
                    <UsersRound aria-hidden="true" className="size-4 shrink-0" />
                    {t('eventRegisteredCount', { count: event.acceptedRegistrationCount })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-border bg-surface-soft p-4 text-sm text-text-muted">
          {t(interests.length ? 'homeInterestEventsEmpty' : 'homeInterestEventsNoInterests')}
        </p>
      )}
    </section>
  );
}

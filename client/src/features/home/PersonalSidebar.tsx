import { CalendarDays, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useParticipationControllerMyActivity } from '@/api/generated/participation/participation';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { QueryError } from '@/components/feedback/QueryError';
import { defaultResourceCover, type ResourceKind } from '@/features/resources/resource-utils';

function Thumbnail({ id, kind }: { id: string; kind: ResourceKind }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const Icon = kind === 'events' ? CalendarDays : UsersRound;
  return (
    <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-(--shape-radius-control) bg-primary-soft text-primary-soft-text">
      {failed ? (
        <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
      ) : (
        <img
          alt=""
          className="h-full w-full object-cover"
          height={56}
          width={80}
          loading="lazy"
          src={defaultResourceCover(id, kind)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function PersonalSidebar(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const activity = useParticipationControllerMyActivity();
  const now = Date.now();
  const events = (activity.data?.events ?? [])
    .filter(
      (item) => item.status === 'ACCEPTED' && !item.cancelled && Date.parse(item.startsAt) > now,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const communities = (activity.data?.communities ?? [])
    .filter((item) => item.status === 'ACTIVE')
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  const card = 'min-w-0 rounded-(--shape-radius-xl) border border-border bg-card p-5 shadow-xs';
  const link =
    'inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary-soft-text hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2';
  const row =
    'flex min-w-0 items-center gap-3 rounded-sm py-4 transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2';
  return (
    <aside aria-label={t('homePersonalActivity')} className="grid min-w-0 content-start gap-3">
      {activity.isPending ? (
        <div className={card}>
          <LoadingSkeleton layout="list" message={t('loadingMyActivity')} rows={3} />
        </div>
      ) : activity.isError ? (
        <div className={card}>
          <QueryError message={t('loadMyActivityError')} onRetry={() => void activity.refetch()} />
        </div>
      ) : (
        <>
          <section aria-labelledby="home-going-heading" className={card}>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h2 id="home-going-heading" className="font-bold">
                {t('homeGoing')}
              </h2>
              <Link className={link} to="/activity?view=events" aria-label={t('homeSeeAllEvents')}>
                {t('homeSeeAll')}
              </Link>
            </div>
            {events.length ? (
              <ul className="divide-y divide-border">
                {events.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <Link className={row} to={`/events/${event.slug}`}>
                      <Thumbnail id={event.id} kind="events" />
                      <span className="grid min-w-0 gap-1">
                        <span className="line-clamp-2 text-sm font-semibold wrap-anywhere">
                          {event.title}
                        </span>
                        <time className="text-xs text-text-muted" dateTime={event.startsAt}>
                          {new Intl.DateTimeFormat(i18n.language, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(event.startsAt))}
                        </time>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-4 py-8 text-center">
                <p className="text-sm font-semibold">{t('homeGoingEmpty')}</p>
                <Button asChild variant="secondary">
                  <Link to="/events?upcoming=true&nonCancelled=true">{t('homeFindEvents')}</Link>
                </Button>
              </div>
            )}
          </section>
          <section aria-labelledby="home-memberships-heading" className={card}>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h2 id="home-memberships-heading" className="font-bold">
                {t('homeYourCommunities')}{' '}
                <span className="ms-1 text-xs font-normal text-text-muted">
                  {communities.length}
                </span>
              </h2>
              <Link
                className={link}
                to="/activity?view=communities"
                aria-label={t('homeSeeAllCommunities')}
              >
                {t('homeSeeAll')}
              </Link>
            </div>
            {communities.length ? (
              <ul className="divide-y divide-border">
                {communities.slice(0, 5).map((community) => (
                  <li key={community.id}>
                    <Link className={row} to={`/communities/${community.slug}`}>
                      <Thumbnail id={community.id} kind="communities" />
                      <span className="line-clamp-2 min-w-0 text-sm font-semibold wrap-anywhere">
                        {community.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-4 py-8 text-center">
                <p className="text-sm text-text-muted">{t('homeCommunitiesEmpty')}</p>
                <Button asChild variant="secondary">
                  <Link to="/communities">{t('homeExploreCommunities')}</Link>
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

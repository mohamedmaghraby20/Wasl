import { CalendarDays, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useParticipationControllerCancelEventRegistration,
  useParticipationControllerLeaveCommunity,
  useParticipationControllerMyActivity,
} from '@/api/generated/participation/participation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/feedback/QueryError';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';
import { formatTurkeyDateTime } from '@/features/resources/resource-utils';

const statusVariant = (status: string): 'success' | 'warning' | 'neutral' =>
  ['ACTIVE', 'ACCEPTED'].includes(status)
    ? 'success'
    : ['PENDING', 'WAITLISTED'].includes(status)
      ? 'warning'
      : 'neutral';

export function MyActivityPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const activity = useParticipationControllerMyActivity({ query: { enabled: Boolean(user) } });
  const leave = useParticipationControllerLeaveCommunity();
  const cancel = useParticipationControllerCancelEventRegistration();
  usePageMetadata(t('myActivity'), t('myActivityDescription'), { noindex: true });

  if (!loading && !user) return <Navigate replace to="/sign-in?returnTo=%2Factivity" />;
  if (activity.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingMyActivity')}
      </p>
    );
  if (activity.isError) {
    return (
      <QueryError message={t('loadMyActivityError')} onRetry={() => void activity.refetch()} />
    );
  }

  const leaveCommunity = async (id: string): Promise<void> => {
    if (!window.confirm(t('confirmLeaveCommunity'))) return;
    try {
      await leave.mutateAsync({ id });
      await queryClient.invalidateQueries();
    } catch {
      toast.error(t('participationActionError'));
    }
  };
  const cancelRegistration = async (id: string): Promise<void> => {
    if (!window.confirm(t('confirmCancelRegistration'))) return;
    try {
      await cancel.mutateAsync({ id });
      await queryClient.invalidateQueries();
    } catch {
      toast.error(t('participationActionError'));
    }
  };

  return (
    <div className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('myActivity')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('myActivityDescription')}</p>
      </header>
      <section className="grid gap-4" aria-labelledby="activity-communities-heading">
        <h2 className="text-xl font-bold" id="activity-communities-heading">
          {t('myCommunities')}
        </h2>
        {activity.data.communities.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-xs">
            {activity.data.communities.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5"
                key={item.id}
              >
                <div className="grid min-w-0 gap-1.5">
                  <Link
                    className="inline-flex items-center gap-2 font-semibold text-text transition-colors hover:text-primary-soft-text"
                    to={`/communities/${item.slug}`}
                  >
                    <UsersRound aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
                    {item.name}
                  </Link>
                  <Badge className="w-fit" variant={statusVariant(item.status)}>
                    {t(`participationStatus_${item.status}`)}
                  </Badge>
                </div>
                {['ACTIVE', 'PENDING', 'WAITLISTED'].includes(item.status) ? (
                  <Button
                    disabled={leave.isPending}
                    onClick={() => void leaveCommunity(item.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t('leaveCommunity')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            description={t('noCommunityActivity')}
            icon={UsersRound}
            title={t('myCommunities')}
          />
        )}
      </section>
      <section className="grid gap-4" aria-labelledby="activity-events-heading">
        <h2 className="text-xl font-bold" id="activity-events-heading">
          {t('myEvents')}
        </h2>
        {activity.data.events.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-xs">
            {activity.data.events.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5"
                key={item.id}
              >
                <div className="grid min-w-0 gap-1.5">
                  <Link
                    className="inline-flex items-center gap-2 font-semibold text-text transition-colors hover:text-primary-soft-text"
                    to={`/events/${item.slug}`}
                  >
                    <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
                    {item.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(item.status)}>
                      {t(`participationStatus_${item.status}`)}
                    </Badge>
                    <span className="text-xs text-text-subtle">
                      {formatTurkeyDateTime(item.startsAt, i18n.language, 'full')}
                    </span>
                  </div>
                  {item.cancelled ? (
                    <p className="text-sm font-medium text-danger" role="status">
                      {t('cancelledMessage')}
                    </p>
                  ) : null}
                </div>
                {['ACCEPTED', 'PENDING', 'WAITLISTED'].includes(item.status) && !item.cancelled ? (
                  <Button
                    disabled={cancel.isPending}
                    onClick={() => void cancelRegistration(item.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t('cancelRegistration')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            description={t('noEventActivity')}
            icon={CalendarDays}
            title={t('myEvents')}
          />
        )}
      </section>
    </div>
  );
}

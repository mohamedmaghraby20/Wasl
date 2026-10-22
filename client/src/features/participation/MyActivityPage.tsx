import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useParticipationControllerCancelEventRegistration,
  useParticipationControllerLeaveCommunity,
  useParticipationControllerMyActivity,
} from '@/api/generated/participation/participation';
import { Button } from '@/components/ui/Button';
import { QueryError } from '@/components/feedback/QueryError';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';
import { formatTurkeyDateTime } from '@/features/resources/resource-utils';

export function MyActivityPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const activity = useParticipationControllerMyActivity({ query: { enabled: Boolean(user) } });
  const leave = useParticipationControllerLeaveCommunity();
  const cancel = useParticipationControllerCancelEventRegistration();
  usePageMetadata(t('myActivity'), t('myActivityDescription'), { noindex: true });

  if (!loading && !user) return <Navigate replace to="/sign-in?returnTo=%2Factivity" />;
  if (activity.isPending) return <p role="status">{t('loadingMyActivity')}</p>;
  if (activity.isError) {
    return <QueryError message={t('loadMyActivityError')} onRetry={() => void activity.refetch()} />;
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
    <div className="mx-auto grid max-w-(--container-reading) gap-8">
      <header className="grid gap-2">
        <h1 className="font-heading text-3xl font-bold">{t('myActivity')}</h1>
        <p className="text-sm text-muted-foreground">{t('myActivityDescription')}</p>
      </header>
      <section className="grid gap-4" aria-labelledby="activity-communities-heading">
        <h2 id="activity-communities-heading" className="font-heading text-xl font-bold">{t('myCommunities')}</h2>
        {activity.data.communities.length ? (
          <ul className="grid gap-3">
            {activity.data.communities.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-(--shape-radius-card) border border-border bg-card p-4">
                <div className="grid gap-1">
                  <Link className="font-semibold underline decoration-primary underline-offset-4" to={`/communities/${item.slug}`}>{item.name}</Link>
                  <p className="text-sm text-muted-foreground">{t(`participationStatus_${item.status}`)}</p>
                </div>
                {['ACTIVE', 'PENDING', 'WAITLISTED'].includes(item.status) && (
                  <Button disabled={leave.isPending} onClick={() => void leaveCommunity(item.id)} variant="outline">{t('leaveCommunity')}</Button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">{t('noCommunityActivity')}</p>}
      </section>
      <section className="grid gap-4" aria-labelledby="activity-events-heading">
        <h2 id="activity-events-heading" className="font-heading text-xl font-bold">{t('myEvents')}</h2>
        {activity.data.events.length ? (
          <ul className="grid gap-3">
            {activity.data.events.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-(--shape-radius-card) border border-border bg-card p-4">
                <div className="grid gap-1">
                  <Link className="font-semibold underline decoration-primary underline-offset-4" to={`/events/${item.slug}`}>{item.title}</Link>
                  <p className="text-sm text-muted-foreground">{t(`participationStatus_${item.status}`)}</p>
                  <p className="text-sm text-muted-foreground">{formatTurkeyDateTime(item.startsAt, i18n.language, 'full')}</p>
                  {item.cancelled && <p role="status" className="text-sm font-semibold text-destructive">{t('cancelledMessage')}</p>}
                </div>
                {['ACCEPTED', 'PENDING', 'WAITLISTED'].includes(item.status) && !item.cancelled && (
                  <Button disabled={cancel.isPending} onClick={() => void cancelRegistration(item.id)} variant="outline">{t('cancelRegistration')}</Button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">{t('noEventActivity')}</p>}
      </section>
    </div>
  );
}

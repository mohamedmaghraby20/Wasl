import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  useParticipationControllerCommunityCounts,
  useParticipationControllerEventCounts,
} from '@/api/generated/participation/participation';

export function ParticipationQueueLinks({
  kind,
  resourceId,
}: {
  kind: 'communities' | 'events';
  resourceId: string;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const community = useParticipationControllerCommunityCounts(resourceId, {
    query: { enabled: kind === 'communities' },
  });
  const event = useParticipationControllerEventCounts(resourceId, {
    query: { enabled: kind === 'events' },
  });
  const counts = kind === 'communities' ? community : event;
  const base = `/${kind}/${resourceId}/participants`;
  if (counts.isError)
    return (
      <Link className="text-xs font-semibold text-primary-soft-text hover:underline" to={base}>
        {t('reviewRequests')}
      </Link>
    );
  if (!counts.data || counts.data.PENDING + counts.data.WAITLISTED === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold">
      <Link
        className="rounded-(--shape-radius-control) bg-primary-soft px-2.5 py-1 text-primary-soft-text hover:underline"
        to={`${base}?status=PENDING`}
      >
        {t('queuePendingCount', { count: counts.data.PENDING })}
      </Link>
      <Link
        className="rounded-(--shape-radius-control) bg-surface-soft px-2.5 py-1 text-text-muted hover:underline"
        to={`${base}?status=WAITLISTED`}
      >
        {t('queueWaitlistedCount', { count: counts.data.WAITLISTED })}
      </Link>
    </div>
  );
}

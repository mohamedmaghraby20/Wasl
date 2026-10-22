import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useParticipationControllerCommunityCounts,
  useParticipationControllerCommunityDecision,
  useParticipationControllerCommunityParticipants,
  useParticipationControllerEventCounts,
  useParticipationControllerEventDecision,
  useParticipationControllerEventParticipants,
} from '@/api/generated/participation/participation';
import { Button } from '@/components/ui/Button';
import { QueryError } from '@/components/feedback/QueryError';

export function OrganizerParticipationPanel({
  kind,
  resourceId,
  eventStarted = false,
}: {
  kind: 'communities' | 'events';
  resourceId: string;
  eventStarted?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const communityParticipants = useParticipationControllerCommunityParticipants(resourceId, {
    query: { enabled: kind === 'communities' },
  });
  const eventParticipants = useParticipationControllerEventParticipants(resourceId, {
    query: { enabled: kind === 'events' },
  });
  const communityCounts = useParticipationControllerCommunityCounts(resourceId, {
    query: { enabled: kind === 'communities' },
  });
  const eventCounts = useParticipationControllerEventCounts(resourceId, {
    query: { enabled: kind === 'events' },
  });
  const communityDecision = useParticipationControllerCommunityDecision();
  const eventDecision = useParticipationControllerEventDecision();
  const participants = kind === 'communities' ? communityParticipants : eventParticipants;
  const counts = kind === 'communities' ? communityCounts : eventCounts;
  const isPending = participants.isPending || counts.isPending;
  const isError = participants.isError || counts.isError;

  const decide = async (participantId: string, action: string): Promise<void> => {
    if (action === 'remove' && !window.confirm(t('confirmRemoveParticipant'))) return;
    try {
      if (kind === 'communities') {
        await communityDecision.mutateAsync({ id: resourceId, participantId, action });
      } else {
        await eventDecision.mutateAsync({ id: resourceId, participantId, action });
      }
      await queryClient.invalidateQueries();
    } catch {
      toast.error(t('participationActionError'));
    }
  };
  const busy = communityDecision.isPending || eventDecision.isPending;

  return (
    <section className="grid gap-4 border-t border-border pt-5" aria-labelledby="organizer-participation-heading">
      <h2 id="organizer-participation-heading" className="font-heading text-xl font-bold">
        {kind === 'communities' ? t('manageMembers') : t('manageRegistrations')}
      </h2>
      {isPending ? <p role="status">{t('loadingParticipation')}</p> : isError ? (
        <QueryError
          message={t('loadOrganizerParticipationError')}
          onRetry={() => {
            void participants.refetch();
            void counts.refetch();
          }}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Count label={t('countPending')} value={counts.data.PENDING} />
            <Count label={t('countWaitlisted')} value={counts.data.WAITLISTED} />
            <Count label={kind === 'communities' ? t('countActive') : t('countAccepted')} value={kind === 'communities' ? counts.data.ACTIVE : counts.data.ACCEPTED} />
            <Count label={t('capacityLabel')} value={counts.data.capacity === 'unlimited' ? t('unlimited') : counts.data.capacity} />
          </dl>
          {participants.data.length ? (
            <ul className="grid gap-3">
              {participants.data.map((participant) => (
                <li key={participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4">
                  <div className="grid gap-1">
                    <p className="font-semibold">{participant.displayName}</p>
                    <p className="text-sm text-muted-foreground">{t(`participationStatus_${participant.status}`)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {participant.status === 'PENDING' && (
                      <>
                        <Button disabled={busy} onClick={() => void decide(participant.id, 'approve')} variant="outline">{t('approveParticipant')}</Button>
                        <Button disabled={busy} onClick={() => void decide(participant.id, 'reject')} variant="outline">{t('rejectParticipant')}</Button>
                      </>
                    )}
                    {participant.status === 'WAITLISTED' && (
                      <>
                        {counts.data.admissionMode === 'approval' && <Button disabled={busy} onClick={() => void decide(participant.id, 'promote')} variant="outline">{t('promoteParticipant')}</Button>}
                        <Button disabled={busy} onClick={() => void decide(participant.id, 'reject')} variant="outline">{t('rejectParticipant')}</Button>
                      </>
                    )}
                    {(kind === 'communities' ? participant.status === 'ACTIVE' : ['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(participant.status)) && (
                      <>
                        {kind === 'events' && eventStarted && participant.status !== 'ATTENDED' && <Button disabled={busy} onClick={() => void decide(participant.id, 'attended')} variant="outline">{t('markAttended')}</Button>}
                        {kind === 'events' && eventStarted && participant.status !== 'NO_SHOW' && <Button disabled={busy} onClick={() => void decide(participant.id, 'no-show')} variant="outline">{t('markNoShow')}</Button>}
                        {(kind === 'communities' || participant.status === 'ACCEPTED') && (
                          <Button className="text-destructive" disabled={busy} onClick={() => void decide(participant.id, 'remove')} variant="outline">{t('removeParticipant')}</Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">{t('noParticipantsYet')}</p>}
        </>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number | string }): React.JSX.Element {
  return (
    <div className="grid gap-1 rounded-(--shape-radius-control) bg-secondary p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-xl font-bold">{value}</dd>
    </div>
  );
}

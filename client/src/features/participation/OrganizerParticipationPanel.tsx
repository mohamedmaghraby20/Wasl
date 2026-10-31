import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ArrowUp,
  Check,
  LoaderCircle,
  ShieldMinus,
  ShieldPlus,
  UserCheck,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  useParticipationControllerCommunityCounts,
  useParticipationControllerCommunityDecision,
  useParticipationControllerCommunityParticipants,
  useParticipationControllerEventCounts,
  useParticipationControllerEventDecision,
  useParticipationControllerEventParticipants,
} from '@/api/generated/participation/participation';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { QueryError } from '@/components/feedback/QueryError';
import { ApiError } from '@/api/fetcher';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/cn';
import {
  useModeratorAssignmentsControllerAssign,
  useModeratorAssignmentsControllerList,
  useModeratorAssignmentsControllerRemove,
} from '@/api/generated/moderation/moderation';

export function OrganizerParticipationPanel({
  kind,
  resourceId,
  eventStarted = false,
  mode = 'all',
}: {
  kind: 'communities' | 'events';
  resourceId: string;
  eventStarted?: boolean;
  mode?: 'all' | 'requests' | 'directory';
}): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<{ participantId: string; action: string } | null>(
    null,
  );
  const [params, setParams] = useSearchParams();
  const activeStatus = kind === 'communities' ? 'ACTIVE' : 'ACCEPTED';
  const selectedStatus = ['PENDING', 'WAITLISTED', activeStatus].includes(
    params.get('status') ?? '',
  )
    ? params.get('status')!
    : 'PENDING';
  const queryClient = useQueryClient();
  const communityCounts = useParticipationControllerCommunityCounts(resourceId, {
    query: { enabled: kind === 'communities' },
  });
  const eventCounts = useParticipationControllerEventCounts(resourceId, {
    query: { enabled: kind === 'events' },
  });
  const counts = kind === 'communities' ? communityCounts : eventCounts;
  const needsParticipants =
    mode !== 'requests' || Boolean(counts.data && counts.data.PENDING + counts.data.WAITLISTED > 0);
  const communityParticipants = useParticipationControllerCommunityParticipants(resourceId, {
    query: { enabled: kind === 'communities' && needsParticipants },
  });
  const eventParticipants = useParticipationControllerEventParticipants(resourceId, {
    query: { enabled: kind === 'events' && needsParticipants },
  });
  const communityDecision = useParticipationControllerCommunityDecision();
  const eventDecision = useParticipationControllerEventDecision();
  const moderationKind = kind === 'communities' ? 'community' : 'event';
  const moderators = useModeratorAssignmentsControllerList(moderationKind, resourceId, {
    query: { enabled: mode === 'all' || (mode === 'directory' && selectedStatus === activeStatus) },
  });
  const assignModerator = useModeratorAssignmentsControllerAssign();
  const removeModerator = useModeratorAssignmentsControllerRemove();
  const { confirm, dialog } = useConfirm();
  const participants = kind === 'communities' ? communityParticipants : eventParticipants;
  const isPending = (needsParticipants && participants.isPending) || counts.isPending;
  const isError = (needsParticipants && participants.isError) || counts.isError;
  const filteredParticipants = (participants.data ?? []).filter((person) => {
    if (mode === 'requests') return person.status === 'PENDING' || person.status === 'WAITLISTED';
    if (mode === 'directory')
      return (
        person.status === selectedStatus &&
        person.displayName
          .toLocaleLowerCase(i18n.language)
          .includes(search.trim().toLocaleLowerCase(i18n.language))
      );
    return true;
  });
  const visibleParticipants =
    mode === 'requests' ? filteredParticipants.slice(0, 5) : filteredParticipants;

  const decide = async (participantId: string, action: string): Promise<void> => {
    if (
      action === 'remove' &&
      !(await confirm({
        title: t('removeParticipant'),
        description: t('confirmRemoveParticipant'),
        confirmLabel: t('removeParticipant'),
        destructive: true,
      }))
    )
      return;
    setProcessing({ participantId, action });
    try {
      if (kind === 'communities') {
        const result = await communityDecision.mutateAsync({
          id: resourceId,
          participantId,
          action,
        });
        if (result.messagingSyncPending) toast.warning(t('messagingSyncPending'));
      } else {
        const result = await eventDecision.mutateAsync({ id: resourceId, participantId, action });
        if (result.messagingSyncPending) toast.warning(t('messagingSyncPending'));
      }
      const prefix = `/api/v1/${kind}/${resourceId}`;
      const affectedPaths = new Set([
        `${prefix}/participants`,
        `${prefix}/participation-counts`,
        `${prefix}/${kind === 'communities' ? 'members' : 'attendees'}`,
        `${prefix}/${kind === 'communities' ? 'member-preview' : 'attendee-preview'}`,
      ]);
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const data = query.state.data;
          return (
            affectedPaths.has(String(query.queryKey[0])) ||
            Boolean(data && typeof data === 'object' && 'id' in data && data.id === resourceId)
          );
        },
      });
    } catch (error) {
      const noCapacity =
        error instanceof ApiError &&
        error.status === 400 &&
        /No (community|event) capacity is currently available/.test(error.message);
      toast.error(t(noCapacity ? 'promoteParticipantNoCapacity' : 'participationActionError'));
    } finally {
      setProcessing(null);
    }
  };
  const busy = communityDecision.isPending || eventDecision.isPending || processing !== null;
  const occupied =
    kind === 'communities'
      ? (counts.data?.ACTIVE ?? 0)
      : (counts.data?.ACCEPTED ?? 0) + (counts.data?.ATTENDED ?? 0) + (counts.data?.NO_SHOW ?? 0);
  const atCapacity =
    counts.data?.capacity !== undefined &&
    counts.data.capacity !== 'unlimited' &&
    occupied >= Number(counts.data.capacity);
  const setModerator = async (userId: string, enabled: boolean): Promise<void> => {
    setProcessing({
      participantId: userId,
      action: enabled ? 'assignModerator' : 'removeModerator',
    });
    try {
      if (enabled)
        await assignModerator.mutateAsync({
          kind: moderationKind,
          id: resourceId,
          data: { userId },
        });
      else await removeModerator.mutateAsync({ kind: moderationKind, id: resourceId, userId });
      await moderators.refetch();
    } catch {
      toast.error(t('moderatorActionError'));
    } finally {
      setProcessing(null);
    }
  };

  if (
    mode === 'requests' &&
    !counts.isError &&
    (!counts.data || counts.data.PENDING + counts.data.WAITLISTED === 0)
  )
    return null;
  const error = counts.error ?? participants.error;
  if (isError && error instanceof ApiError && error.status === 403)
    return <EmptyState title={t('organizersOnly')} className="bg-card" />;

  return (
    <section
      className={
        mode === 'requests'
          ? 'grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5'
          : 'grid gap-4'
      }
    >
      {mode === 'requests' ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">
            {t(kind === 'communities' ? 'membershipRequests' : 'registrationRequests')}
          </h2>
          <Link
            className="shrink-0 text-sm font-semibold text-primary-soft-text hover:underline"
            to={`/${kind}/${resourceId}/participants?status=${counts.data?.PENDING ? 'PENDING' : 'WAITLISTED'}`}
          >
            {t('seeAll')}
          </Link>
        </div>
      ) : mode === 'all' && kind === 'events' ? (
        <h2 id="organizer-participation-heading" className="font-heading text-xl font-bold">
          {t('manageRegistrations')}
        </h2>
      ) : null}
      {isPending ? (
        <p role="status">{t('loadingParticipants')}</p>
      ) : isError ? (
        <QueryError
          message={t('loadOrganizerParticipationError')}
          onRetry={() => {
            void participants.refetch();
            void counts.refetch();
          }}
        />
      ) : (
        <>
          {busy ? (
            <p
              className="flex items-center gap-2 text-sm text-text-muted"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              {t('updatingParticipation')}
            </p>
          ) : null}
          {mode === 'all' ? (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Count label={t('countPending')} value={counts.data.PENDING} />
              <Count label={t('countWaitlisted')} value={counts.data.WAITLISTED} />
              <Count
                label={kind === 'communities' ? t('countActive') : t('countAccepted')}
                value={kind === 'communities' ? counts.data.ACTIVE : counts.data.ACCEPTED}
              />
              <Count
                label={t('capacityLabel')}
                value={counts.data.capacity === 'unlimited' ? t('unlimited') : counts.data.capacity}
              />
            </dl>
          ) : null}
          {atCapacity && counts.data.WAITLISTED > 0 && counts.data.admissionMode === 'approval' ? (
            <p className="text-sm text-warning" role="note">
              {t('participationCapacityFull')}
            </p>
          ) : null}
          {mode === 'directory' ? (
            <>
              <nav aria-label={t('participationFilters')} className="flex flex-wrap gap-2">
                {['PENDING', 'WAITLISTED', activeStatus].map((status) => (
                  <Button
                    key={status}
                    aria-current={selectedStatus === status ? 'page' : undefined}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set('status', status);
                      setParams(next);
                    }}
                    size="sm"
                    variant={selectedStatus === status ? 'secondary' : 'ghost'}
                  >
                    {t(
                      status === 'PENDING'
                        ? 'countPending'
                        : status === 'WAITLISTED'
                          ? 'countWaitlisted'
                          : kind === 'communities'
                            ? 'countActive'
                            : 'countAccepted',
                    )}{' '}
                    <span>
                      {counts.data[status as 'PENDING' | 'WAITLISTED' | 'ACTIVE' | 'ACCEPTED']}
                    </span>
                  </Button>
                ))}
              </nav>
              <Field id="participant-review-search" label={t('searchParticipants')}>
                <SearchInput
                  aria-label={t('searchParticipants')}
                  id="participant-review-search"
                  value={search}
                  onValueChange={setSearch}
                />
              </Field>
            </>
          ) : null}
          {visibleParticipants.length ? (
            <ul className="grid gap-2">
              {visibleParticipants.map((participant) => (
                <li
                  key={participant.id}
                  className={cn(
                    'items-center gap-x-3 gap-y-2 rounded-(--shape-radius-card) border border-border bg-card px-3 py-2',
                    mode === 'requests'
                      ? 'grid grid-cols-[minmax(0,1fr)_auto]'
                      : 'flex flex-wrap justify-between',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary-soft-text"
                    >
                      {participant.avatarUrl ? (
                        <img
                          alt=""
                          className="size-full object-cover"
                          src={participant.avatarUrl}
                        />
                      ) : (
                        participant.displayName.trim().slice(0, 1).toLocaleUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <Link
                        className="block truncate text-sm font-semibold hover:underline"
                        to={`/users/${participant.userId}`}
                      >
                        {participant.displayName}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {t(
                          participant.status === 'PENDING'
                            ? 'requestPendingLabel'
                            : participant.status === 'WAITLISTED'
                              ? 'requestWaitlistedLabel'
                              : participant.status === 'ACTIVE'
                                ? 'attendeeMember'
                                : participant.status === 'ACCEPTED'
                                  ? 'countAccepted'
                                  : `participationStatus_${participant.status}`,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {moderators.isSuccess &&
                    (kind === 'communities'
                      ? participant.status === 'ACTIVE'
                      : participant.status === 'ACCEPTED') ? (
                      <IconButton
                        icon={
                          processing?.participantId === participant.userId
                            ? LoaderCircle
                            : moderators.data.some((entry) => entry.userId === participant.userId)
                              ? ShieldMinus
                              : ShieldPlus
                        }
                        label={t(
                          processing?.participantId === participant.userId
                            ? 'updatingParticipation'
                            : moderators.data.some((entry) => entry.userId === participant.userId)
                              ? 'removeModerator'
                              : 'assignModerator',
                        )}
                        intent={
                          moderators.data.some((entry) => entry.userId === participant.userId)
                            ? 'warning'
                            : 'success'
                        }
                        disabled={busy || assignModerator.isPending || removeModerator.isPending}
                        onClick={() =>
                          void setModerator(
                            participant.userId,
                            !moderators.data.some((entry) => entry.userId === participant.userId),
                          )
                        }
                        variant="outline"
                        className={
                          processing?.participantId === participant.userId
                            ? '[&_svg]:animate-spin'
                            : undefined
                        }
                      />
                    ) : null}
                    {participant.status === 'PENDING' && (
                      <>
                        <Button
                          aria-label={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'approve'
                              ? 'updatingParticipation'
                              : 'approveParticipant',
                          )}
                          title={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'approve'
                              ? 'updatingParticipation'
                              : 'approveParticipant',
                          )}
                          size="icon-sm"
                          intent="success"
                          disabled={busy}
                          onClick={() => void decide(participant.id, 'approve')}
                          variant="outline"
                        >
                          {processing?.participantId === participant.id &&
                          processing.action === 'approve' ? (
                            <LoaderCircle aria-hidden="true" className="animate-spin" />
                          ) : (
                            <Check aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          aria-label={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'reject'
                              ? 'updatingParticipation'
                              : 'rejectParticipant',
                          )}
                          title={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'reject'
                              ? 'updatingParticipation'
                              : 'rejectParticipant',
                          )}
                          size="icon-sm"
                          intent="danger"
                          disabled={busy}
                          onClick={() => void decide(participant.id, 'reject')}
                          variant="outline"
                        >
                          {processing?.participantId === participant.id &&
                          processing.action === 'reject' ? (
                            <LoaderCircle aria-hidden="true" className="animate-spin" />
                          ) : (
                            <X aria-hidden="true" />
                          )}
                        </Button>
                      </>
                    )}
                    {participant.status === 'WAITLISTED' && (
                      <>
                        {counts.data.admissionMode === 'approval' && (
                          <IconButton
                            icon={
                              processing?.participantId === participant.id &&
                              processing.action === 'promote'
                                ? LoaderCircle
                                : ArrowUp
                            }
                            label={t(
                              atCapacity
                                ? 'promoteParticipantNoCapacity'
                                : processing?.participantId === participant.id &&
                                    processing.action === 'promote'
                                  ? 'updatingParticipation'
                                  : 'promoteParticipant',
                            )}
                            disabled={busy || atCapacity}
                            onClick={() => void decide(participant.id, 'promote')}
                            intent="success"
                            className={
                              processing?.participantId === participant.id &&
                              processing.action === 'promote'
                                ? '[&_svg]:animate-spin'
                                : undefined
                            }
                            variant="outline"
                          />
                        )}
                        <Button
                          aria-label={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'reject'
                              ? 'updatingParticipation'
                              : 'rejectParticipant',
                          )}
                          title={t(
                            processing?.participantId === participant.id &&
                              processing.action === 'reject'
                              ? 'updatingParticipation'
                              : 'rejectParticipant',
                          )}
                          size="icon-sm"
                          intent="danger"
                          disabled={busy}
                          onClick={() => void decide(participant.id, 'reject')}
                          variant="outline"
                        >
                          {processing?.participantId === participant.id &&
                          processing.action === 'reject' ? (
                            <LoaderCircle aria-hidden="true" className="animate-spin" />
                          ) : (
                            <X aria-hidden="true" />
                          )}
                        </Button>
                      </>
                    )}
                    {(kind === 'communities'
                      ? participant.status === 'ACTIVE'
                      : ['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(participant.status)) && (
                      <>
                        {kind === 'events' && eventStarted && participant.status !== 'ATTENDED' && (
                          <IconButton
                            icon={
                              processing?.participantId === participant.id &&
                              processing.action === 'attended'
                                ? LoaderCircle
                                : UserCheck
                            }
                            label={t(
                              processing?.participantId === participant.id &&
                                processing.action === 'attended'
                                ? 'updatingParticipation'
                                : 'markAttended',
                            )}
                            disabled={busy}
                            onClick={() => void decide(participant.id, 'attended')}
                            intent="success"
                            className={
                              processing?.participantId === participant.id &&
                              processing.action === 'attended'
                                ? '[&_svg]:animate-spin'
                                : undefined
                            }
                            variant="outline"
                          />
                        )}
                        {kind === 'events' && eventStarted && participant.status !== 'NO_SHOW' && (
                          <IconButton
                            icon={
                              processing?.participantId === participant.id &&
                              processing.action === 'no-show'
                                ? LoaderCircle
                                : UserX
                            }
                            label={t(
                              processing?.participantId === participant.id &&
                                processing.action === 'no-show'
                                ? 'updatingParticipation'
                                : 'markNoShow',
                            )}
                            disabled={busy}
                            onClick={() => void decide(participant.id, 'no-show')}
                            intent="warning"
                            className={
                              processing?.participantId === participant.id &&
                              processing.action === 'no-show'
                                ? '[&_svg]:animate-spin'
                                : undefined
                            }
                            variant="outline"
                          />
                        )}
                        {(kind === 'communities' || participant.status === 'ACCEPTED') && (
                          <IconButton
                            icon={
                              processing?.participantId === participant.id &&
                              processing.action === 'remove'
                                ? LoaderCircle
                                : UserMinus
                            }
                            label={t(
                              processing?.participantId === participant.id &&
                                processing.action === 'remove'
                                ? 'updatingParticipation'
                                : 'removeParticipant',
                            )}
                            intent="danger"
                            disabled={busy}
                            onClick={() => void decide(participant.id, 'remove')}
                            className={
                              processing?.participantId === participant.id &&
                              processing.action === 'remove'
                                ? '[&_svg]:animate-spin'
                                : undefined
                            }
                            variant="outline"
                          />
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">
              {t(
                mode === 'directory'
                  ? search
                    ? 'noMembersFound'
                    : 'noRequestsInFilter'
                  : 'noParticipantsYet',
              )}
            </p>
          )}
        </>
      )}
      {dialog}
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

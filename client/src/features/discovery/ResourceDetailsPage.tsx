import { useState } from 'react';
import { Archive, ArrowLeft, CalendarX, ClipboardList, LogOut, MessageSquare, Pencil, Share2, TicketPlus, TicketX, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import {
  useCommunitiesControllerArchive,
  useCommunitiesControllerRemove,
  getCommunitiesControllerMineQueryKey,
  useCommunitiesControllerMine,
} from '@/api/generated/communities/communities';
import { useEventsControllerCancel } from '@/api/generated/events/events';
import { useOrganizationsControllerMine } from '@/api/generated/organizations/organizations';
import {
  getParticipationControllerCommunityStatusQueryKey,
  getParticipationControllerEventStatusQueryKey,
  getParticipationControllerMyActivityQueryKey,
  useParticipationControllerCancelEventRegistration,
  useParticipationControllerCommunityStatus,
  useParticipationControllerEventStatus,
  useParticipationControllerJoinCommunity,
  useParticipationControllerLeaveCommunity,
  useParticipationControllerRegisterForEvent,
} from '@/api/generated/participation/participation';
import {
  useDiscoveryControllerCommunity,
  useDiscoveryControllerEvent,
  getDiscoveryControllerCommunityQueryKey,
  getDiscoveryControllerEventQueryKey,
  getDiscoveryControllerListCommunitiesQueryKey,
  getDiscoveryControllerListEventsQueryKey,
} from '@/api/generated/discovery/discovery';
import { ApiError } from '@/api/fetcher';
import { getMessagingControllerConversationsQueryKey } from '@/api/generated/messaging/messaging';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDeleteConfirmation } from '@/components/ui/DeleteDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/feedback/QueryError';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  languageCode,
  localizedResourceTitle,
  type ResourceKind,
} from '@/features/resources/resource-utils';
import { usePageMetadata } from './usePageMetadata';
import { useAuth } from '@/features/auth/AuthProvider';
import { OrganizerParticipationPanel } from '@/features/participation/OrganizerParticipationPanel';
import { EventDiscussion } from '@/features/discussions/EventDiscussion';
import { ReportAction } from '@/features/moderation/ReportAction';
import { useModeratorAssignmentsControllerPermissions } from '@/api/generated/moderation/moderation';
import {
  useMessagingControllerCommunity,
  useMessagingControllerEvent,
} from '@/api/generated/messaging/messaging';
import { ResourceOverview } from './ResourceOverview';
import { EventAttendeePreview } from '@/features/participation/EventAttendeePreview';
import { CommunityDetailsLayout } from './CommunityDetailsLayout';

export function ResourceDetailsPage({ kind }: { kind: ResourceKind }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const language = languageCode(i18n.language);
  const community = useDiscoveryControllerCommunity(
    id,
    { lang: language },
    { query: { enabled: kind === 'communities' && Boolean(id) } },
  );
  const event = useDiscoveryControllerEvent(
    id,
    { lang: language },
    { query: { enabled: kind === 'events' && Boolean(id) } },
  );
  const query = kind === 'communities' ? community : event;
  const item = query.data;
  const scopedPermissions = useModeratorAssignmentsControllerPermissions(
    kind === 'events' ? 'event' : 'community',
    item?.id ?? '',
    {
      query: { enabled: Boolean(user && item) },
    },
  );
  const currentUser = useUsersControllerCurrent(
    { lang: language },
    { query: { enabled: Boolean(user) } },
  );
  const managedCommunities = useCommunitiesControllerMine({
    query: {
      enabled:
        Boolean(user) &&
        kind === 'events' &&
        Boolean(item && 'hostType' in item && item.hostType === 'community'),
    },
  });
  const managesViaOrganization = Boolean(
    item &&
      ('startsAt' in item ? item.hostType === 'organization' : item.ownerType === 'organization'),
  );
  const managedOrganizations = useOrganizationsControllerMine({
    query: { enabled: Boolean(user) && managesViaOrganization },
  });
  const archiveCommunity = useCommunitiesControllerArchive();
  const deleteCommunity = useCommunitiesControllerRemove();
  const { requestDeletion, deleteDialog } = useDeleteConfirmation();
  const cancelEvent = useEventsControllerCancel();
  const communityStatus = useParticipationControllerCommunityStatus(item?.id ?? '', {
    query: {
      enabled: Boolean(
        user &&
          item &&
          kind === 'communities' &&
          !(
            !('startsAt' in item) &&
            item.ownerType === 'user' &&
            item.ownerId === currentUser.data?.id
          ),
      ),
    },
  });
  const eventStatus = useParticipationControllerEventStatus(item?.id ?? '', {
    query: { enabled: Boolean(user && kind === 'events' && item) },
  });
  const joinCommunity = useParticipationControllerJoinCommunity();
  const leaveCommunity = useParticipationControllerLeaveCommunity();
  const registerForEvent = useParticipationControllerRegisterForEvent();
  const cancelRegistration = useParticipationControllerCancelEventRegistration();
  const openCommunityChat = useMessagingControllerCommunity();
  const openEventChat = useMessagingControllerEvent();
  const [chatError, setChatError] = useState(false);
  const { confirm, dialog } = useConfirm();
  const resourceName = t(kind === 'events' ? 'event' : 'community').toLocaleLowerCase(
    i18n.language,
  );
  const structuredData = item
    ? {
        '@context': 'https://schema.org',
        '@type': kind === 'events' ? 'Event' : 'Organization',
        name: localizedResourceTitle(item),
        description: item.description,
        url: `${window.location.origin}/${kind}/${item.slug}`,
        ...('startsAt' in item ? { startDate: item.startsAt } : {}),
        ...('online' in item && item.online
          ? { eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode' }
          : {}),
      }
    : undefined;
  const isUnlistedEvent =
    kind === 'events' && (!item || ('visibility' in item && item.visibility !== 'public'));
  usePageMetadata(
    item ? localizedResourceTitle(item) : t('loadingDetails'),
    item?.description ?? t('discoverIntro'),
    {
      ...(item ? { canonicalPath: `/${kind}/${item.slug}` } : {}),
      noindex: isUnlistedEvent,
      ...(structuredData ? { structuredData } : {}),
    },
  );

  const copyShareLink = async (): Promise<void> => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API is unavailable.');
      await navigator.clipboard.writeText(
        kind === 'communities' && item
          ? `${window.location.origin}/communities/${item.slug}`
          : window.location.href,
      );
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('linkCopyFailed'));
    }
  };

  if (query.isPending) {
    return (
      <div className="mx-auto grid max-w-(--container-reading) gap-4" role="status">
        <span className="sr-only">{t('loadingDetails')}</span>
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-sm sm:p-8">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-2 h-14 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (query.isError) {
    if (!(query.error instanceof ApiError && query.error.status === 404)) {
      return (
        <QueryError
          message={t('loadError', { resource: resourceName })}
          onRetry={() => void query.refetch()}
        />
      );
    }
    return (
      <EmptyState
        className="mx-auto w-full max-w-(--container-reading) bg-card"
        title={t('notFoundResource', { resource: resourceName })}
        role="alert"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={`/${kind}`}>{t('backTo', { resource: t(kind) })}</Link>
          </Button>
        }
      />
    );
  }
  if (!item) {
    return (
      <EmptyState
        className="bg-card"
        role="alert"
        title={t('notFoundResource', { resource: resourceName })}
      />
    );
  }

  const eventItem = 'startsAt' in item ? item : undefined;
  const communityItem = 'startsAt' in item ? undefined : item;
  const managesOrganization = (organizationId: string | undefined): boolean =>
    Boolean(
      organizationId && managedOrganizations.data?.some((managed) => managed.id === organizationId),
    );
  const isManager = currentUser.data
    ? eventItem
      ? eventItem.hostType === 'user'
        ? eventItem.hostId === currentUser.data.id
        : eventItem.hostType === 'community'
          ? managedCommunities.data?.some((managed) => managed.id === eventItem.hostId)
          : managesOrganization(eventItem.hostId)
      : communityItem?.ownerType === 'user'
        ? communityItem.ownerId === currentUser.data.id
        : communityItem?.ownerType === 'organization' && managesOrganization(communityItem.ownerId)
    : false;
  const managerCheckPending = Boolean(
    user &&
      eventItem &&
      (currentUser.isPending ||
        (eventItem.hostType === 'community' && managedCommunities.isPending) ||
        (eventItem.hostType === 'organization' && managedOrganizations.isPending)),
  );
  const hostPath = eventItem
    ? eventItem.hostType === 'user'
      ? `/users/${eventItem.hostId}`
      : eventItem.hostType === 'community'
        ? `/communities/${eventItem.hostId}`
        : eventItem.organizationSlug
          ? `/organizations/${eventItem.organizationSlug}`
          : undefined
    : communityItem?.ownerType === 'user'
      ? `/users/${communityItem.ownerId}`
      : communityItem?.organizationSlug
        ? `/organizations/${communityItem.organizationSlug}`
        : undefined;
  const archive = async (): Promise<void> => {
    if (
      !(await confirm({
        title: t('archiveCommunity'),
        description: t('confirmArchiveCommunity'),
        confirmLabel: t('archiveCommunity'),
        destructive: true,
      }))
    )
      return;
    try {
      await archiveCommunity.mutateAsync({ id: item.id });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getDiscoveryControllerCommunityQueryKey(item.id).slice(0, 1),
        }),
        queryClient.invalidateQueries({
          queryKey: getDiscoveryControllerListCommunitiesQueryKey().slice(0, 1),
        }),
        queryClient.invalidateQueries({
          queryKey: getCommunitiesControllerMineQueryKey().slice(0, 1),
        }),
      ]);
      toast.success(t('communityArchived'));
      void navigate('/communities');
    } catch {
      toast.error(t('resourceSaveError'));
    }
  };
  const cancel = async (): Promise<void> => {
    if (
      !(await confirm({
        title: t('cancelEventAction'),
        description: t('confirmCancelEvent'),
        confirmLabel: t('cancelEventAction'),
        destructive: true,
      }))
    )
      return;
    try {
      await cancelEvent.mutateAsync({ id: item.id });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getDiscoveryControllerEventQueryKey(item.id).slice(0, 1),
        }),
        queryClient.invalidateQueries({
          queryKey: getDiscoveryControllerListEventsQueryKey().slice(0, 1),
        }),
      ]);
      toast.success(t('eventCancelled'));
    } catch {
      toast.error(t('resourceSaveError'));
    }
  };
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const participationStatus =
    kind === 'communities' ? communityStatus.data?.status : eventStatus.data?.status;
  const participationPending =
    kind === 'communities' ? communityStatus.isPending : eventStatus.isPending;
  const participationError = kind === 'communities' ? communityStatus.isError : eventStatus.isError;
  const runParticipationAction = async (): Promise<void> => {
    try {
      let messagingSyncPending = false;
      if (kind === 'communities') {
        if (
          participationStatus === 'ACTIVE' ||
          participationStatus === 'PENDING' ||
          participationStatus === 'WAITLISTED'
        ) {
          if (
            !(await confirm({
              title: t('leaveCommunity'),
              description: t('confirmLeaveCommunity'),
              confirmLabel: t('leaveCommunity'),
              destructive: true,
            }))
          )
            return;
          messagingSyncPending = Boolean(
            (await leaveCommunity.mutateAsync({ id: item.id })).messagingSyncPending,
          );
        } else {
          messagingSyncPending = Boolean(
            (await joinCommunity.mutateAsync({ id: item.id })).messagingSyncPending,
          );
        }
      } else if (
        participationStatus === 'ACCEPTED' ||
        participationStatus === 'PENDING' ||
        participationStatus === 'WAITLISTED'
      ) {
        if (
          !(await confirm({
            title: t('cancelRegistration'),
            description: t('confirmCancelRegistration'),
            confirmLabel: t('cancelRegistration'),
            destructive: true,
          }))
        )
          return;
        messagingSyncPending = Boolean(
          (await cancelRegistration.mutateAsync({ id: item.id })).messagingSyncPending,
        );
      } else {
        messagingSyncPending = Boolean(
          (await registerForEvent.mutateAsync({ id: item.id })).messagingSyncPending,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            kind === 'communities'
              ? getParticipationControllerCommunityStatusQueryKey(item.id)
              : getParticipationControllerEventStatusQueryKey(item.id),
        }),
        queryClient.invalidateQueries({ queryKey: getParticipationControllerMyActivityQueryKey() }),
      ]);
      if (messagingSyncPending) toast.warning(t('messagingSyncPending'));
    } catch {
      toast.error(t('participationActionError'));
    }
  };
  const participationBusy =
    joinCommunity.isPending ||
    leaveCommunity.isPending ||
    registerForEvent.isPending ||
    cancelRegistration.isPending;
  const participationLeaving =
    kind === 'communities'
      ? ['ACTIVE', 'PENDING', 'WAITLISTED'].includes(participationStatus ?? '')
      : ['ACCEPTED', 'PENDING', 'WAITLISTED'].includes(participationStatus ?? '');
  const openChat = async (): Promise<void> => {
    if (!user) return;
    setChatError(false);
    try {
      if (eventItem) await openEventChat.mutateAsync({ id: eventItem.id });
      else await openCommunityChat.mutateAsync({ id: communityItem!.id });
      await queryClient.invalidateQueries({
        queryKey: getMessagingControllerConversationsQueryKey(),
      });
      void navigate('/messages');
    } catch {
      setChatError(true);
    }
  };
  const admissionLabels: Record<string, string> = {
    open: 'admissionOpen',
    instant: 'admissionInstant',
    approval: 'admissionApproval',
    automatic: 'admissionAutomatic',
  };
  const admissionLabel = admissionLabels[item.admissionMode] ?? 'admissionUnknown';
  if (communityItem) {
    const canViewMembers = Boolean(user && (isManager || participationStatus === 'ACTIVE'));
    return (
      <>
        <CommunityDetailsLayout
          item={communityItem}
          hostPath={hostPath}
          canManage={Boolean(isManager)}
          canViewMembers={canViewMembers}
          viewerId={currentUser.data?.id}
          onCopyShare={() => void copyShareLink()}
          managementActions={
            <>
              <Button
                asChild
                aria-label={t('editCommunity')}
                size="icon-sm"
                title={t('editCommunity')}
                variant="outline"
              >
                <Link to={`/communities/${item.id}/edit`}>
                  <Pencil aria-hidden="true" />
                </Link>
              </Button>
              <Button
                aria-label={t('archiveCommunity')}
                intent="warning"
                disabled={archiveCommunity.isPending}
                onClick={() => void archive()}
                size="icon-sm"
                title={t('archiveCommunity')}
                variant="outline"
              >
                <Archive aria-hidden="true" />
              </Button>
              <ReportAction targetType="community" targetId={item.id} />
              <Button
                aria-label={t('deleteCommunity')}
                intent="danger"
                disabled={deleteCommunity.isPending}
                onClick={() =>
                  requestDeletion({
                    title: t('deleteCommunity'),
                    description: t('deleteCommunityWarning'),
                    confirmationText: communityItem.name,
                    confirmLabel: t('deleteCommunity'),
                    successMessage: t('communityDeleted'),
                    errorMessage: t('communityDeleteError'),
                    onDelete: async () => {
                      const result = await deleteCommunity.mutateAsync({
                        id: item.id,
                        data: { confirmationName: communityItem.name },
                      });
                      return result.chatCleanupPending
                        ? t('communityDeletedChatPending')
                        : t('communityDeleted');
                    },
                    onComplete: () => {
                      void navigate('/communities');
                      queryClient.removeQueries({
                        queryKey: getDiscoveryControllerCommunityQueryKey(id, { lang: language }),
                      });
                      void Promise.all([
                        queryClient.invalidateQueries({
                          queryKey: getDiscoveryControllerListCommunitiesQueryKey().slice(0, 1),
                        }),
                        queryClient.invalidateQueries({
                          queryKey: getDiscoveryControllerListEventsQueryKey().slice(0, 1),
                        }),
                        queryClient.invalidateQueries({
                          queryKey: getCommunitiesControllerMineQueryKey(),
                        }),
                        queryClient.invalidateQueries({
                          queryKey: getParticipationControllerMyActivityQueryKey(),
                        }),
                        queryClient.invalidateQueries({
                          queryKey: getMessagingControllerConversationsQueryKey(),
                        }),
                      ]);
                    },
                  })
                }
                size="icon-sm"
                title={t('deleteCommunity')}
                variant="outline"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </>
          }
          membershipAction={
            <>
              {!user ? (
                <Button asChild aria-label={t('joinCommunity')} title={t('joinCommunity')} size="icon-sm">
                  <Link to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>
                    <UserPlus aria-hidden="true" />
                  </Link>
                </Button>
              ) : currentUser.isPending || participationPending ? (
                <p className="text-sm text-text-muted" role="status">
                  {t('loadingParticipation')}
                </p>
              ) : currentUser.isError || participationError ? (
                <p className="text-sm text-danger" role="alert">
                  {t('participationActionError')}
                </p>
              ) : (
                <>
                  {participationStatus ? (
                    <span className="text-xs text-text-muted" role="status">
                      {t(`participationStatus_${participationStatus}`)}
                    </span>
                  ) : null}
                  <IconButton
                    icon={participationLeaving ? LogOut : UserPlus}
                    label={t(participationLeaving ? 'leaveCommunity' : 'joinCommunity')}
                    disabled={participationBusy}
                    onClick={() => void runParticipationAction()}
                    intent={participationLeaving ? 'danger' : undefined}
                    variant={participationLeaving ? 'outline' : 'primary'}
                  />
                </>
              )}
              <ReportAction targetType="community" targetId={item.id} />
            </>
          }
          managementPanel={
            <OrganizerParticipationPanel kind="communities" resourceId={item.id} mode="requests" />
          }
          chatAction={
            canViewMembers ? (
              <div className="grid gap-2">
                <IconButton
                  icon={MessageSquare}
                  label={t('openResourceChat')}
                  disabled={openCommunityChat.isPending}
                  onClick={() => void openChat()}
                  variant="outline"
                />
                {chatError ? (
                  <p role="alert" className="text-sm text-danger">
                    {t('resourceChatError')}
                  </p>
                ) : null}
              </div>
            ) : null
          }
        />
        {dialog}
        {deleteDialog}
      </>
    );
  }
  return (
    <article className="mx-auto grid max-w-(--container-reading) gap-6">
      <div className="grid justify-items-start gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          to={`/${kind}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t('backTo', { resource: t(kind) })}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-label={t('copyShare')}
            onClick={() => void copyShareLink()}
            size="icon-sm"
            title={t('copyShare')}
            variant="outline"
          >
            <Share2 aria-hidden="true" />
          </Button>
          <ReportAction
            targetType={kind === 'events' ? 'event' : 'community'}
            targetId={item.id}
          />
          {isManager && eventItem ? (
            <>
              {!eventItem.cancelled ? (
                <>
                  <Button asChild aria-label={t('editEvent')} title={t('editEvent')} size="icon-sm" variant="outline">
                    <Link to={`/events/${item.id}/edit`}><Pencil aria-hidden="true" /></Link>
                  </Button>
                  <IconButton icon={CalendarX} label={t('cancelEventAction')} intent="danger" disabled={cancelEvent.isPending} onClick={() => void cancel()} variant="outline" />
                </>
              ) : null}
              <Button asChild aria-label={t('reviewRequests')} title={t('reviewRequests')} size="icon-sm" variant="outline">
                <Link to={`/events/${item.id}/participants?status=PENDING`}><ClipboardList aria-hidden="true" /></Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <ResourceOverview item={item} hostPath={hostPath} admissionLabel={admissionLabel} />
      {eventItem &&
        currentUser.isSuccess &&
        (isManager || ['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(participationStatus ?? '')) ? (
          <EventAttendeePreview eventId={eventItem.id} />
        ) : null}
      {eventItem && user && managerCheckPending ? (
        <section className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5">
          <h2 className="font-heading text-xl font-bold">{t('manageRegistrations')}</h2>
          <LoadingSkeleton message={t('loadingParticipants')} rows={3} />
        </section>
      ) : isManager && eventItem ? (
        <section className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5">
          <OrganizerParticipationPanel
            kind={kind}
            resourceId={item.id}
            eventStarted={Boolean(
              eventItem && new Date(eventItem.startsAt).getTime() <= Date.now(),
            )}
          />
        </section>
      ) : null}
      {currentUser.isSuccess &&
        !isManager &&
        !eventItem?.cancelled &&
        !(eventItem && new Date(eventItem.startsAt).getTime() <= Date.now()) && (
          <section
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
          >
            {user ? (
              participationPending ? (
                <p className="text-sm text-text-muted" role="status">
                  {t('loadingParticipation')}
                </p>
              ) : participationError ? (
                <p className="text-sm font-medium text-danger" role="alert">
                  {t('participationActionError')}
                </p>
              ) : (
                <>
                  {participationStatus ? (
                    <p className="text-sm font-medium text-text" role="status">
                      {t(`participationStatus_${participationStatus}`)}
                    </p>
                  ) : null}
                  {!(eventItem && ['ATTENDED', 'NO_SHOW'].includes(participationStatus ?? '')) && (
                    <IconButton
                      icon={participationLeaving ? TicketX : TicketPlus}
                      label={t(participationLeaving ? 'cancelRegistration' : 'registerForEvent')}
                      disabled={participationBusy}
                      onClick={() => void runParticipationAction()}
                      intent={participationLeaving ? 'danger' : undefined}
                      variant={participationLeaving ? 'outline' : 'primary'}
                    />
                  )}
                </>
              )
            ) : (
              <Button asChild aria-label={t('registerForEvent')} title={t('registerForEvent')} size="icon-sm">
                <Link
                  to={{ pathname: '/sign-in', search: `?returnTo=${encodeURIComponent(returnTo)}` }}
                >
                  <TicketPlus aria-hidden="true" />
                </Link>
              </Button>
            )}
          </section>
        )}
      {user &&
        !eventItem?.cancelled &&
        (isManager ||
          (kind === 'communities'
            ? participationStatus === 'ACTIVE'
            : participationStatus === 'ACCEPTED')) && (
          <section className="flex flex-wrap items-center gap-3">
            <IconButton
              icon={MessageSquare}
              label={t('openResourceChat')}
              disabled={openCommunityChat.isPending || openEventChat.isPending}
              onClick={() => void openChat()}
              variant="outline"
            />
            {chatError ? (
              <p className="text-sm font-medium text-danger" role="alert">
                {t('resourceChatError')}
              </p>
            ) : null}
          </section>
        )}
      {eventItem && (
        <EventDiscussion
          eventId={eventItem.id}
          signedIn={Boolean(user)}
          canPost={Boolean(
            user && (isManager || (!eventItem.cancelled && participationStatus === 'ACCEPTED')),
          )}
          returnTo={returnTo}
          viewerId={currentUser.data?.id}
          moderator={Boolean(isManager || scopedPermissions.data?.moderator)}
          canEditOthers={Boolean(isManager)}
        />
      )}
      {dialog}
    </article>
  );
}

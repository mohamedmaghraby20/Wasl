import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageSquare,
  Share2,
  Ticket,
  UsersRound,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import {
  useCommunitiesControllerArchive,
  useCommunitiesControllerMine,
} from '@/api/generated/communities/communities';
import { useEventsControllerCancel } from '@/api/generated/events/events';
import { useOrganizationsControllerMine } from '@/api/generated/organizations/organizations';
import {
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
} from '@/api/generated/discovery/discovery';
import { ApiError } from '@/api/fetcher';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/feedback/QueryError';
import {
  formatTurkeyDateTime,
  languageCode,
  localizedName,
  localizedResourceTitle,
  type ResourceKind,
} from '@/features/resources/resource-utils';
import { usePageMetadata } from './usePageMetadata';
import { useAuth } from '@/features/auth/AuthProvider';
import { OrganizerParticipationPanel } from '@/features/participation/OrganizerParticipationPanel';
import { EventDiscussion } from '@/features/discussions/EventDiscussion';
import { CommunityTopics } from '@/features/discussions/CommunityTopics';
import {
  useMessagingControllerCommunity,
  useMessagingControllerEvent,
} from '@/api/generated/messaging/messaging';

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
  const cancelEvent = useEventsControllerCancel();
  const communityStatus = useParticipationControllerCommunityStatus(item?.id ?? '', {
    query: { enabled: Boolean(user) && kind === 'communities' && Boolean(item) },
  });
  const eventStatus = useParticipationControllerEventStatus(item?.id ?? '', {
    query: { enabled: Boolean(user) && kind === 'events' && Boolean(item) },
  });
  const joinCommunity = useParticipationControllerJoinCommunity();
  const leaveCommunity = useParticipationControllerLeaveCommunity();
  const registerForEvent = useParticipationControllerRegisterForEvent();
  const cancelRegistration = useParticipationControllerCancelEventRegistration();
  const openCommunityChat = useMessagingControllerCommunity();
  const openEventChat = useMessagingControllerEvent();
  const [chatError, setChatError] = useState(false);
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
      await navigator.clipboard.writeText(window.location.href);
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
      <div
        className="mx-auto grid max-w-(--container-reading) justify-items-center gap-3 rounded-(--shape-radius-card) border border-border bg-card px-6 py-12 text-center"
        role="alert"
      >
        <p className="text-base font-semibold">
          {t('notFoundResource', { resource: resourceName })}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to={`/${kind}`}>{t('backTo', { resource: t(kind) })}</Link>
        </Button>
      </div>
    );
  }
  if (!item) {
    return (
      <p className="rounded-(--shape-radius-card) border border-border bg-card p-5" role="alert">
        {t('notFoundResource', { resource: resourceName })}
      </p>
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
    if (!window.confirm(t('confirmArchiveCommunity'))) return;
    try {
      await archiveCommunity.mutateAsync({ id: item.id });
      await queryClient.invalidateQueries();
      toast.success(t('communityArchived'));
      void navigate('/communities');
    } catch {
      toast.error(t('resourceSaveError'));
    }
  };
  const cancel = async (): Promise<void> => {
    if (!window.confirm(t('confirmCancelEvent'))) return;
    try {
      await cancelEvent.mutateAsync({ id: item.id });
      await queryClient.invalidateQueries();
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
          if (!window.confirm(t('confirmLeaveCommunity'))) return;
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
        if (!window.confirm(t('confirmCancelRegistration'))) return;
        messagingSyncPending = Boolean(
          (await cancelRegistration.mutateAsync({ id: item.id })).messagingSyncPending,
        );
      } else {
        messagingSyncPending = Boolean(
          (await registerForEvent.mutateAsync({ id: item.id })).messagingSyncPending,
        );
      }
      await queryClient.invalidateQueries();
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
      await queryClient.invalidateQueries();
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
  return (
    <article className="mx-auto grid max-w-(--container-reading) gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          to={`/${kind}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t('backTo', { resource: t(kind) })}
        </Link>
        <Button onClick={() => void copyShareLink()} size="sm" variant="outline">
          <Share2 aria-hidden="true" />
          {t('copyShare')}
        </Button>
      </div>

      <header className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-3">
          {item.categories.length > 0 ? (
            <ul aria-label={t('allCategories')} className="flex flex-wrap gap-1.5">
              {item.categories.map((category) => (
                <li key={category.id}>
                  <Badge variant="primary">{localizedName(category, i18n.language)}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <h1 className="text-3xl font-extrabold sm:text-4xl">{localizedResourceTitle(item)}</h1>
          <p className="text-sm text-text-muted">
            <span>{t('hostedByLabel')} </span>
            {hostPath ? (
              <Link
                className="font-semibold text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
                to={hostPath}
              >
                {item.hostName}
              </Link>
            ) : (
              <span className="font-medium text-text">{item.hostName}</span>
            )}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
          {item.description}
        </p>
        {eventItem ? (
          <div className="flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary-soft-text">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="grid gap-0.5 text-sm">
              <p className="font-semibold">
                {formatTurkeyDateTime(eventItem.startsAt, i18n.language, 'full')}
              </p>
              {eventItem.endsAt ? (
                <p className="text-xs opacity-80">
                  {t('endsAt', {
                    date: formatTurkeyDateTime(eventItem.endsAt, i18n.language, 'full'),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {eventItem?.cancelled ? (
          <p
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            role="status"
          >
            {t('cancelledMessage')}
          </p>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4">
          {eventItem?.online ? (
            <Video aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-subtle" />
          ) : (
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-subtle" />
          )}
          <p className="text-sm font-medium text-text">
            {eventItem?.online
              ? t('online')
              : eventItem?.locationName
                ? `${eventItem.locationName}, ${item.cityName ?? ''}`.replace(/, $/, '')
                : item.cityName}
          </p>
        </div>
        {!eventItem?.cancelled ? (
          <div className="flex items-start gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4">
            <Ticket aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-subtle" />
            <p className="text-sm font-medium text-text">
              {t('admission', { mode: t(admissionLabel) })}
            </p>
          </div>
        ) : null}
        {item.capacity !== undefined && item.capacity !== null ? (
          <div className="flex items-start gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4">
            <UsersRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-subtle" />
            <p className="text-sm font-medium text-text">
              {t('capacity', { capacity: item.capacity })}
            </p>
          </div>
        ) : null}
      </section>
      {isManager ? (
        <section className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5">
          <div className="flex flex-wrap gap-3">
            {eventItem ? (
              !eventItem.cancelled ? (
                <>
                  <Button asChild variant="outline">
                    <Link to={`/events/${item.id}/edit`}>{t('editEvent')}</Link>
                  </Button>
                  <Button
                    className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                    disabled={cancelEvent.isPending}
                    onClick={() => void cancel()}
                    variant="outline"
                  >
                    {t('cancelEventAction')}
                  </Button>
                </>
              ) : null
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to={`/communities/${item.id}/edit`}>{t('editCommunity')}</Link>
                </Button>
                <Button
                  className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                  disabled={archiveCommunity.isPending}
                  onClick={() => void archive()}
                  variant="outline"
                >
                  {t('archiveCommunity')}
                </Button>
              </>
            )}
          </div>
          <OrganizerParticipationPanel
            kind={kind}
            resourceId={item.id}
            eventStarted={Boolean(
              eventItem && new Date(eventItem.startsAt).getTime() <= Date.now(),
            )}
          />
        </section>
      ) : null}
      {!isManager &&
        !eventItem?.cancelled &&
        !(eventItem && new Date(eventItem.startsAt).getTime() <= Date.now()) && (
          <section
            aria-live="polite"
            className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-5"
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
                    <Button
                      className="w-fit"
                      disabled={participationBusy}
                      onClick={() => void runParticipationAction()}
                      variant={participationLeaving ? 'outline' : 'primary'}
                    >
                      {kind === 'communities'
                        ? participationLeaving
                          ? t('leaveCommunity')
                          : t('joinCommunity')
                        : participationLeaving
                          ? t('cancelRegistration')
                          : t('registerForEvent')}
                    </Button>
                  )}
                </>
              )
            ) : (
              <Button asChild className="w-fit">
                <Link
                  to={{ pathname: '/sign-in', search: `?returnTo=${encodeURIComponent(returnTo)}` }}
                >
                  {kind === 'communities' ? t('joinCommunity') : t('registerForEvent')}
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
            <Button
              className="w-fit"
              disabled={openCommunityChat.isPending || openEventChat.isPending}
              onClick={() => void openChat()}
              variant="outline"
            >
              <MessageSquare aria-hidden="true" />
              {t('openResourceChat')}
            </Button>
            {chatError ? (
              <p className="text-sm font-medium text-danger" role="alert">
                {t('resourceChatError')}
              </p>
            ) : null}
          </section>
        )}
      {communityItem && (
        <CommunityTopics
          communityId={communityItem.id}
          canPost={Boolean(user && (isManager || participationStatus === 'ACTIVE'))}
        />
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
          moderator={Boolean(isManager)}
        />
      )}
    </article>
  );
}

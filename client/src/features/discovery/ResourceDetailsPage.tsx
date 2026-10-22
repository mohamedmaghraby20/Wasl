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
import { Button } from '@/components/ui/Button';
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

  if (query.isPending) return <p role="status">{t('loadingDetails')}</p>;
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
      <div role="alert" className="rounded-lg border border-border bg-card p-5">
        {t('notFoundResource', { resource: resourceName })}
      </div>
    );
  }
  if (!item) return <p role="alert">{t('notFoundResource', { resource: resourceName })}</p>;

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
      if (kind === 'communities') {
        if (
          participationStatus === 'ACTIVE' ||
          participationStatus === 'PENDING' ||
          participationStatus === 'WAITLISTED'
        ) {
          if (!window.confirm(t('confirmLeaveCommunity'))) return;
          await leaveCommunity.mutateAsync({ id: item.id });
        } else {
          await joinCommunity.mutateAsync({ id: item.id });
        }
      } else if (
        participationStatus === 'ACCEPTED' ||
        participationStatus === 'PENDING' ||
        participationStatus === 'WAITLISTED'
      ) {
        if (!window.confirm(t('confirmCancelRegistration'))) return;
        await cancelRegistration.mutateAsync({ id: item.id });
      } else {
        await registerForEvent.mutateAsync({ id: item.id });
      }
      await queryClient.invalidateQueries();
    } catch {
      toast.error(t('participationActionError'));
    }
  };
  const participationBusy =
    joinCommunity.isPending ||
    leaveCommunity.isPending ||
    registerForEvent.isPending ||
    cancelRegistration.isPending;
  const admissionLabels: Record<string, string> = {
    open: 'admissionOpen',
    instant: 'admissionInstant',
    approval: 'admissionApproval',
    automatic: 'admissionAutomatic',
  };
  const admissionLabel = admissionLabels[item.admissionMode] ?? 'admissionUnknown';
  return (
    <article className="mx-auto grid max-w-(--container-reading) gap-5 rounded-(--shape-radius-dialog) bg-card p-(--card-padding) shadow-(--shadow-card)">
      <Link
        className="text-sm text-[color:var(--color-primary-soft-text)] hover:underline"
        to={`/${kind}`}
      >
        {t('backTo', { resource: t(kind) })}
      </Link>
      <ul className="flex flex-wrap gap-2" aria-label={t('allCategories')}>
        {item.categories.map((category) => (
          <li key={category.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
            {localizedName(category, i18n.language)}
          </li>
        ))}
      </ul>
      <h1 className="text-3xl font-bold">{localizedResourceTitle(item)}</h1>
      <p className="whitespace-pre-wrap text-[color:var(--color-text-muted)]">{item.description}</p>
      <p>
        <span>{t('hostedByLabel')} </span>
        {hostPath ? (
          <Link
            className="font-semibold underline decoration-primary underline-offset-4"
            to={hostPath}
          >
            {item.hostName}
          </Link>
        ) : (
          item.hostName
        )}
      </p>
      {eventItem && (
        <div className="grid gap-1 rounded-(--shape-radius-control) bg-primary-soft p-4">
          <p className="font-semibold">
            {formatTurkeyDateTime(eventItem.startsAt, i18n.language, 'full')}
          </p>
          {eventItem.endsAt && (
            <p className="text-sm text-[color:var(--color-text-muted)]">
              {t('endsAt', {
                date: formatTurkeyDateTime(eventItem.endsAt, i18n.language, 'full'),
              })}
            </p>
          )}
        </div>
      )}
      <p>
        {eventItem?.online
          ? t('online')
          : eventItem?.locationName
            ? `${eventItem.locationName}, ${item.cityName ?? ''}`.replace(/, $/, '')
            : item.cityName}
      </p>
      {!eventItem?.cancelled && <p>{t('admission', { mode: t(admissionLabel) })}</p>}
      {item.capacity !== undefined && item.capacity !== null && (
        <p>{t('capacity', { capacity: item.capacity })}</p>
      )}
      {eventItem?.cancelled && (
        <p role="status" className="font-semibold text-destructive">
          {t('cancelledMessage')}
        </p>
      )}
      {isManager && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          {eventItem ? (
            <>
              {!eventItem.cancelled && (
                <>
                  <Button asChild variant="outline">
                    <Link to={`/events/${item.id}/edit`}>{t('editEvent')}</Link>
                  </Button>
                  <Button
                    className="text-destructive"
                    disabled={cancelEvent.isPending}
                    onClick={() => void cancel()}
                    variant="outline"
                  >
                    {t('cancelEventAction')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link to={`/communities/${item.id}/edit`}>{t('editCommunity')}</Link>
              </Button>
              <Button
                className="text-destructive"
                disabled={archiveCommunity.isPending}
                onClick={() => void archive()}
                variant="outline"
              >
                {t('archiveCommunity')}
              </Button>
            </>
          )}
        </div>
      )}
      {isManager && (
        <OrganizerParticipationPanel
          kind={kind}
          resourceId={item.id}
          eventStarted={Boolean(eventItem && new Date(eventItem.startsAt).getTime() <= Date.now())}
        />
      )}
      {!isManager &&
        !eventItem?.cancelled &&
        !(eventItem && new Date(eventItem.startsAt).getTime() <= Date.now()) && (
          <section className="grid gap-3 border-t border-border pt-5" aria-live="polite">
            {user ? (
              participationPending ? (
                <p role="status">{t('loadingParticipation')}</p>
              ) : participationError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t('participationActionError')}
                </p>
              ) : (
                <>
                  {participationStatus && (
                    <p role="status" className="font-semibold">
                      {t(`participationStatus_${participationStatus}`)}
                    </p>
                  )}
                  {!(eventItem && ['ATTENDED', 'NO_SHOW'].includes(participationStatus ?? '')) && (
                    <Button
                      disabled={participationBusy}
                      onClick={() => void runParticipationAction()}
                      variant="outline"
                    >
                      {kind === 'communities'
                        ? ['ACTIVE', 'PENDING', 'WAITLISTED'].includes(participationStatus ?? '')
                          ? t('leaveCommunity')
                          : t('joinCommunity')
                        : ['ACCEPTED', 'PENDING', 'WAITLISTED'].includes(participationStatus ?? '')
                          ? t('cancelRegistration')
                          : t('registerForEvent')}
                    </Button>
                  )}
                </>
              )
            ) : (
              <Button asChild variant="outline">
                <Link
                  to={{ pathname: '/sign-in', search: `?returnTo=${encodeURIComponent(returnTo)}` }}
                >
                  {kind === 'communities' ? t('joinCommunity') : t('registerForEvent')}
                </Link>
              </Button>
            )}
          </section>
        )}
      <Button variant="outline" onClick={() => void copyShareLink()}>
        {t('copyShare')}
      </Button>
    </article>
  );
}

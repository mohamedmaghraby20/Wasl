import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useParticipationControllerCommunityMemberPreview } from '@/api/generated/participation/participation';
import { QueryError } from '@/components/feedback/QueryError';
import { Avatar } from './ParticipantAvatar';
import { useUsersControllerPublicProfile } from '@/api/generated/users/users';
import type { CommunityPublicDto } from '@/api/generated/wasl-client.schemas';

export function CommunityMemberPreview({
  communityId,
  viewerId,
  canViewMembers = true,
  community,
}: {
  communityId: string;
  viewerId?: string | undefined;
  canViewMembers?: boolean;
  community?: CommunityPublicDto;
}): React.JSX.Element {
  const { t } = useTranslation();
  const query = useParticipationControllerCommunityMemberPreview(communityId, {
    query: { enabled: canViewMembers },
  });
  const organizer = useUsersControllerPublicProfile(community?.ownerId ?? '', undefined, {
    query: { enabled: !canViewMembers && community?.ownerType === 'user' },
  });
  if (canViewMembers && query.isPending) return <p role="status">{t('loadingParticipation')}</p>;
  if (canViewMembers && query.isError)
    return (
      <QueryError message={t('loadCommunityMembersError')} onRetry={() => void query.refetch()} />
    );
  const host = canViewMembers
    ? query.data?.host
    : community?.ownerType === 'user'
      ? {
          userId: community.ownerId,
          displayName: organizer.data?.displayName ?? community.hostName,
          avatarUrl: organizer.data?.avatarUrl ?? null,
        }
      : null;
  const members = canViewMembers ? (query.data?.members ?? []) : [];
  const total = canViewMembers ? (query.data?.total ?? 0) : (community?.memberCount ?? 0);
  const people = [
    ...(host ? [host] : []),
    ...members.filter((member) => member.userId !== host?.userId),
  ].slice(0, 12);
  return (
    <div className="grid w-full gap-4">
      {host ? (
        <section
          aria-labelledby="community-organizers-heading"
          className="grid gap-4 rounded-(--shape-radius-2xl) border border-border bg-card p-5 shadow-xs"
        >
          <h2 className="font-heading text-lg font-extrabold" id="community-organizers-heading">
            {t('organizers')}
          </h2>
          <div className="flex items-center gap-4">
            <Link
              aria-label={host.displayName}
              className="[&>span]:size-12"
              to={`/users/${host.userId}`}
            >
              <Avatar displayName={host.displayName} avatarUrl={host.avatarUrl} />
            </Link>
            <div className="min-w-0">
              <Link
                className="block truncate font-semibold hover:underline"
                to={`/users/${host.userId}`}
              >
                {host.displayName}
              </Link>
              {host.userId !== viewerId ? (
                <Link
                  className="mt-1 block text-sm font-semibold text-primary-soft-text hover:underline"
                  to={`/messages?to=${encodeURIComponent(host.userId)}`}
                >
                  {t('messageOrganizer')}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : community ? (
        <section className="grid gap-3 rounded-(--shape-radius-2xl) border border-border bg-card p-5 shadow-xs">
          <h2 className="font-heading text-lg font-extrabold">{t('organizers')}</h2>
          <Link
            className="font-semibold text-primary-soft-text hover:underline"
            to={
              community.organizationSlug
                ? `/organizations/${community.organizationSlug}`
                : `/users/${community.ownerId}`
            }
          >
            {community.hostName}
          </Link>
        </section>
      ) : null}
      <section
        aria-labelledby="community-members-heading"
        className="grid gap-5 rounded-(--shape-radius-2xl) border border-border bg-card p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="flex items-baseline gap-2 font-heading text-lg font-extrabold"
            id="community-members-heading"
          >
            {t('communityMembers')}{' '}
            <span className="text-sm font-medium text-text-muted">{total}</span>
          </h2>
          {canViewMembers && total ? (
            <Link
              className="text-sm font-semibold text-primary-soft-text hover:underline"
              to={`/communities/${communityId}/members`}
            >
              {t('seeAll')}
            </Link>
          ) : null}
        </div>
        {!canViewMembers ? (
          <p className="text-sm leading-relaxed text-text-muted">{t('membersOnly')}</p>
        ) : people.length ? (
          <ul className="grid grid-cols-6 gap-2">
            {people.map((member) => (
              <li key={member.userId}>
                <Link
                  aria-label={member.displayName}
                  className="block w-fit rounded-full [&>span]:size-8 [&>span]:text-sm sm:[&>span]:size-9"
                  title={member.displayName}
                  to={`/users/${member.userId}`}
                >
                  <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">{t('noParticipantsYet')}</p>
        )}
      </section>
    </div>
  );
}

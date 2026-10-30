import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useParticipationControllerCommunityMemberPreview } from '@/api/generated/participation/participation';
import { QueryError } from '@/components/feedback/QueryError';
import { Avatar } from './ParticipantAvatar';

export function CommunityMemberPreview({
  communityId,
  viewerId,
}: {
  communityId: string;
  viewerId?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const query = useParticipationControllerCommunityMemberPreview(communityId);
  if (query.isPending) return <p role="status">{t('loadingParticipation')}</p>;
  if (query.isError)
    return (
      <QueryError message={t('loadCommunityMembersError')} onRetry={() => void query.refetch()} />
    );
  const { host, members, total } = query.data;
  const people = [
    ...(host ? [host] : []),
    ...members.filter((member) => member.userId !== host?.userId),
  ].slice(0, 12);
  return (
    <div className="grid w-full max-w-lg gap-4">
      {host ? (
        <section
          aria-labelledby="community-organizers-heading"
          className="grid gap-4 rounded-(--shape-radius-2xl) border border-border bg-card p-6 shadow-xs sm:p-8"
        >
          <h2 className="font-heading text-2xl font-extrabold" id="community-organizers-heading">
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
                className="block truncate text-lg font-semibold hover:underline"
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
      ) : null}
      <section
        aria-labelledby="community-members-heading"
        className="grid gap-6 rounded-(--shape-radius-2xl) border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="flex items-baseline gap-3 font-heading text-2xl font-extrabold"
            id="community-members-heading"
          >
            {t('communityMembers')}{' '}
            <span className="text-sm font-medium text-text-muted">{total}</span>
          </h2>
          {total ? (
            <Link
              className="text-sm font-semibold text-primary-soft-text hover:underline"
              to={`/communities/${communityId}/members`}
            >
              {t('seeAll')}
            </Link>
          ) : null}
        </div>
        {people.length ? (
          <ul className="grid grid-cols-4 gap-3 min-[420px]:grid-cols-6 sm:gap-4">
            {people.map((member) => (
              <li key={member.userId}>
                <Link
                  aria-label={member.displayName}
                  className="block w-fit rounded-full [&>span]:size-11 sm:[&>span]:size-12"
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

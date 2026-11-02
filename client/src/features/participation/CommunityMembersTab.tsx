import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useParticipationControllerCommunityMembers } from '@/api/generated/participation/participation';
import { QueryError } from '@/components/feedback/QueryError';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Field } from '@/components/ui/Field';
import { Avatar } from './ParticipantAvatar';

export function CommunityMembersTab({
  communityId,
  canManage = false,
}: {
  communityId: string;
  canManage?: boolean;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useParticipationControllerCommunityMembers(communityId);
  if (query.isPending) return <LoadingSkeleton layout="list" message={t('loadingParticipation')} rows={3} />;
  if (query.isError)
    return (
      <QueryError message={t('loadCommunityMembersError')} onRetry={() => void query.refetch()} />
    );
  const members = query.data.filter((person) =>
    person.displayName
      .toLocaleLowerCase(i18n.language)
      .includes(search.trim().toLocaleLowerCase(i18n.language)),
  );
  return (
    <section aria-labelledby="community-directory-heading" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold" id="community-directory-heading">
          {t('communityMembers')}
        </h2>
        {canManage ? (
          <Link
            className="text-sm font-semibold text-primary-soft-text hover:underline"
            to={`/communities/${communityId}/participants?status=ACTIVE`}
          >
            {t('manageActiveMembers')}
          </Link>
        ) : null}
      </div>
      <Field id="community-member-search" label={t('searchMembers')}>
        <SearchInput
          aria-label={t('searchMembers')}
          id="community-member-search"
          value={search}
          onValueChange={setSearch}
        />
      </Field>
      {members.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((person) => (
            <li key={person.userId}>
              <Link
                className="flex items-center gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4 hover:bg-surface-soft [&>span:first-child]:size-11"
                to={`/users/${person.userId}`}
              >
                <Avatar displayName={person.displayName} avatarUrl={person.avatarUrl} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{person.displayName}</span>
                  <span className="text-xs text-text-muted">
                    {t(person.isHost ? 'attendeeOrganizer' : 'attendeeMember')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          {t(search ? 'noMembersFound' : 'noParticipantsYet')}
        </p>
      )}
    </section>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useParticipationControllerCommunityMembers } from '@/api/generated/participation/participation';
import { QueryError } from '@/components/feedback/QueryError';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Avatar } from './ParticipantAvatar';

export function CommunityMembersTab({ communityId }: { communityId: string }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useParticipationControllerCommunityMembers(communityId);
  if (query.isPending) return <p role="status">{t('loadingParticipation')}</p>;
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
      <h2 className="font-heading text-2xl font-bold" id="community-directory-heading">
        {t('communityMembers')}
      </h2>
      <Field id="community-member-search" label={t('searchMembers')}>
        <Input
          id="community-member-search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
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

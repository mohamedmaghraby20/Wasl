import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useParticipationControllerCommunityMembers } from '@/api/generated/participation/participation';
import { useDiscoveryControllerCommunity } from '@/api/generated/discovery/discovery';
import { ApiError } from '@/api/fetcher';
import { QueryError } from '@/components/feedback/QueryError';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { languageCode, localizedResourceTitle } from '@/features/resources/resource-utils';
import { Avatar } from './CommunityMemberPreview';
import { usePageMetadata } from '../discovery/usePageMetadata';

export function CommunityMembersPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const [search, setSearch] = useState('');
  const language = languageCode(i18n.language);
  const community = useDiscoveryControllerCommunity(
    id,
    { lang: language },
    { query: { enabled: Boolean(id) } },
  );
  const members = useParticipationControllerCommunityMembers(id, {
    query: { enabled: Boolean(id) },
  });
  const communityTitle = community.data ? localizedResourceTitle(community.data) : t('community');
  usePageMetadata(t('attendees'), communityTitle);

  if (members.isPending) {
    return (
      <p className="mx-auto max-w-(--container-reading) text-sm text-text-muted" role="status">
        {t('loadingParticipation')}
      </p>
    );
  }
  if (members.isError) {
    if (members.error instanceof ApiError && members.error.status === 403) {
      return (
        <EmptyState
          className="mx-auto max-w-(--container-reading) bg-card"
          title={t('membersOnly')}
          action={
            <Link
              className="text-sm font-semibold text-primary-soft-text hover:underline"
              to={`/communities/${id}`}
            >
              {t('communityDetails')}
            </Link>
          }
        />
      );
    }
    return (
      <div className="mx-auto w-full max-w-(--container-reading)">
        <QueryError
          message={t('loadCommunityMembersError')}
          onRetry={() => void members.refetch()}
        />
      </div>
    );
  }

  const filteredMembers = members.data.filter((member) =>
    member.displayName
      .toLocaleLowerCase(i18n.language)
      .includes(search.trim().toLocaleLowerCase(i18n.language)),
  );

  return (
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-text-muted hover:text-text"
        to={`/communities/${id}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('communityDetails')}
      </Link>
      <header className="grid gap-2">
        <h1 className="font-heading text-3xl font-extrabold">{t('attendees')}</h1>
        <p className="text-text-muted">{communityTitle}</p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <Field className="min-w-0 flex-1" id="member-search" label={t('searchMembers')}>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted rtl:left-auto rtl:right-3"
            />
            <Input
              className="pl-10 rtl:pl-3 rtl:pr-10"
              id="member-search"
              onChange={(event) => setSearch(event.currentTarget.value)}
              value={search}
            />
          </div>
        </Field>
        <span className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-soft-text">
          {t('countActive')}: {members.data.length}
        </span>
      </div>
      {filteredMembers.length ? (
        <ul className="grid gap-3">
          {filteredMembers.map((member) => (
            <li key={member.userId}>
              <Link
                className="flex items-center gap-4 rounded-(--shape-radius-card) border border-border bg-card p-4 hover:bg-surface-soft"
                to={`/users/${member.userId}`}
              >
                <Avatar avatarUrl={member.avatarUrl} displayName={member.displayName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{member.displayName}</span>
                  <span
                    className={
                      member.isHost
                        ? 'inline-flex rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary-soft-text'
                        : 'text-sm text-text-muted'
                    }
                  >
                    {t(member.isHost ? 'attendeeHost' : 'attendeeMember')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-text-muted">
          {search ? t('noMembersFound') : t('noParticipantsYet')}
        </p>
      )}
    </section>
  );
}

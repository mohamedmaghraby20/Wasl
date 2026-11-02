import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import {
  useParticipationControllerCommunityMembers,
  useParticipationControllerEventAttendees,
} from '@/api/generated/participation/participation';
import {
  useDiscoveryControllerCommunity,
  useDiscoveryControllerEvent,
} from '@/api/generated/discovery/discovery';
import { ApiError } from '@/api/fetcher';
import { QueryError } from '@/components/feedback/QueryError';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { languageCode, localizedResourceTitle } from '@/features/resources/resource-utils';
import { Avatar } from './ParticipantAvatar';
import { usePageMetadata } from '../discovery/usePageMetadata';
import { useModeratorAssignmentsControllerPermissions } from '@/api/generated/moderation/moderation';

export function CommunityMembersPage({
  kind = 'communities',
}: {
  kind?: 'communities' | 'events';
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const [search, setSearch] = useState('');
  const language = languageCode(i18n.language);
  const community = useDiscoveryControllerCommunity(
    id,
    { lang: language },
    { query: { enabled: Boolean(id) && kind === 'communities' } },
  );
  const event = useDiscoveryControllerEvent(
    id,
    { lang: language },
    {
      query: { enabled: Boolean(id) && kind === 'events' },
    },
  );
  const communityMembers = useParticipationControllerCommunityMembers(id, {
    query: { enabled: Boolean(id) && kind === 'communities' },
  });
  const eventAttendees = useParticipationControllerEventAttendees(id, {
    query: { enabled: Boolean(id) && kind === 'events' },
  });
  const members = kind === 'events' ? eventAttendees : communityMembers;
  const resource = kind === 'events' ? event : community;
  const permissions = useModeratorAssignmentsControllerPermissions(
    kind === 'events' ? 'event' : 'community',
    resource.data?.id ?? '',
    { query: { enabled: Boolean(resource.data) } },
  );
  const communityTitle = resource.data
    ? localizedResourceTitle(resource.data)
    : t(kind === 'events' ? 'event' : 'community');
  const heading = kind === 'events' ? 'attendees' : 'communityMembers';
  const backLabel = kind === 'events' ? 'eventDetails' : 'communityDetails';
  usePageMetadata(t(heading), communityTitle, { noindex: true });

  if (members.isPending) {
    return (
      <LoadingSkeleton className="mx-auto w-full max-w-(--container-reading)" layout="list" message={t('loadingParticipation')} rows={5} />
    );
  }
  if (members.isError) {
    if (members.error instanceof ApiError && members.error.status === 403) {
      return (
        <EmptyState
          className="mx-auto max-w-(--container-reading) bg-card"
          title={t(kind === 'events' ? 'attendeesOnly' : 'membersOnly')}
          action={
            <Link
              className="text-sm font-semibold text-primary-soft-text hover:underline"
              to={`/${kind}/${id}`}
            >
              {t(backLabel)}
            </Link>
          }
        />
      );
    }
    return (
      <div className="mx-auto w-full max-w-(--container-reading)">
        <QueryError
          message={t(kind === 'events' ? 'loadEventAttendeesError' : 'loadCommunityMembersError')}
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
        to={`/${kind}/${id}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t(backLabel)}
      </Link>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-3xl font-extrabold">{t(heading)}</h1>
          {permissions.data?.manager ? (
            <Link
              className="text-sm font-semibold text-primary-soft-text hover:underline"
              to={`/${kind}/${resource.data!.id}/participants?status=${kind === 'events' ? 'ACCEPTED' : 'ACTIVE'}`}
            >
              {t(kind === 'events' ? 'manageAttendees' : 'manageActiveMembers')}
            </Link>
          ) : null}
        </div>
        <p className="text-text-muted">{communityTitle}</p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <Field
          className="min-w-0 flex-1"
          id="member-search"
          label={t(kind === 'events' ? 'searchAttendees' : 'searchMembers')}
        >
          <SearchInput
            aria-label={t(kind === 'events' ? 'searchAttendees' : 'searchMembers')}
            id="member-search"
            onValueChange={setSearch}
            value={search}
          />
        </Field>
        <span className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-soft-text">
          {t(heading)}: {members.data.length}
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
                    {t(
                      member.isHost
                        ? kind === 'events'
                          ? 'attendeeHost'
                          : 'attendeeOrganizer'
                        : 'attendeeMember',
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-text-muted">
          {search
            ? t('noMembersFound')
            : t(kind === 'events' ? 'noEventAttendeesYet' : 'noParticipantsYet')}
        </p>
      )}
    </section>
  );
}

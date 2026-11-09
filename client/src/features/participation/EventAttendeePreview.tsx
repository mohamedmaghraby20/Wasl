import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useParticipationControllerEventAttendeePreview } from '@/api/generated/participation/participation';
import { Badge } from '@/components/ui/Badge';
import { QueryError } from '@/components/feedback/QueryError';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { Avatar } from './ParticipantAvatar';

export function EventAttendeePreview({ eventId }: { eventId: string }): React.JSX.Element {
  const { t } = useTranslation();
  const members = useParticipationControllerEventAttendeePreview(eventId);
  const host = members.data?.host;
  const people = [
    ...(host ? [{ ...host, isHost: true }] : []),
    ...(members.data?.members
      .filter((member) => member.userId !== host?.userId)
      .map((member) => ({ ...member, isHost: false })) ?? []),
  ];
  const total = members.data?.total ?? 0;
  const visiblePeople = people.slice(0, total > 4 ? 3 : 4);
  const remaining = total - visiblePeople.length;

  return (
    <section aria-labelledby="event-attendees-heading" className="grid gap-8 py-2">
      <div className="flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-3 font-heading text-2xl font-extrabold"
          id="event-attendees-heading"
        >
          {t('attendees')}
          {!members.isPending && !members.isError ? (
          <Badge variant="neutral">{total}</Badge>
          ) : null}
        </h2>
        {members.data?.total ? (
          <Link
            className="text-sm font-semibold text-primary-soft-text hover:underline"
            to={`/events/${eventId}/attendees`}
          >
            {t('seeAll')}
          </Link>
        ) : null}
      </div>
      {members.isPending ? (
        <LoadingSkeleton layout="list" message={t('loadingParticipation')} rows={2} />
      ) : members.isError ? (
        <QueryError message={t('loadEventAttendeesError')} onRetry={() => void members.refetch()} />
      ) : people.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visiblePeople.map((member) => (
            <li key={member.userId}>
              <Link
                className="flex min-h-56 h-full flex-col items-center rounded-(--shape-radius-2xl) border border-border bg-card px-3 py-5 text-center shadow-xs transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={`/users/${member.userId}`}
              >
                <span className="relative mb-5 [&>span:first-child]:size-22">
                  <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} />
                  {member.isHost ? (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-(--shape-radius-control) border-2 border-card bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-soft-text">
                      {t('attendeeHost')}
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-2 max-w-full break-words text-base font-semibold">
                  {member.displayName}
                </span>
                <span className="mt-1 text-sm text-text-muted">
                  {t(member.isHost ? 'attendeeOrganizer' : 'attendeeMember')}
                </span>
              </Link>
            </li>
          ))}
          {remaining > 0 ? (
            <li>
              <Link
                className="flex min-h-56 h-full flex-col items-center rounded-(--shape-radius-2xl) border border-border bg-card px-3 py-5 text-center shadow-xs hover:bg-surface-soft"
                to={`/events/${eventId}/attendees`}
              >
                <span
                  aria-hidden="true"
                  className="mb-5 grid size-22 grid-cols-2 gap-1 [&_span]:size-full [&_span]:text-sm"
                >
                  {people.slice(3, 6).map((person) => (
                    <Avatar
                      key={person.userId}
                      displayName={person.displayName}
                      avatarUrl={person.avatarUrl}
                    />
                  ))}
                  <span className="grid place-items-center rounded-(--shape-radius-control) bg-primary-soft text-xs font-bold text-primary-soft-text">
                    +{remaining}
                  </span>
                </span>
                <span className="font-semibold">{t('attendeesMore', { count: remaining })}</span>
                <span className="mt-1 text-sm text-text-muted">{t('attendees')}</span>
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">{t('noEventAttendeesYet')}</p>
      )}
    </section>
  );
}

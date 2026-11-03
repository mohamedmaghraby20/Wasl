import { CalendarDays, MapPin, UsersRound, Video } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Badge } from '@/components/ui/Badge';
import {
  localizedName,
  defaultResourceCover,
  localizedResourceTitle,
  turkeyDateParts,
  type ResourceKind,
} from './resource-utils';

export function ResourceCard({
  item,
  kind,
}: {
  item: CommunityPublicDto | EventPublicDto;
  kind: ResourceKind;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const event = kind === 'events' && 'startsAt' in item ? item : undefined;
  const date = event ? turkeyDateParts(event.startsAt, i18n.language) : undefined;
  const [firstCategory, ...otherCategories] = item.categories;
  const cover = defaultResourceCover(item.id, kind);
  const [failedCover, setFailedCover] = useState<string>();
  const CoverIcon = event ? CalendarDays : UsersRound;
  const remaining =
    event?.capacity == null ? null : Math.max(0, event.capacity - event.acceptedRegistrationCount);
  const attendeeCount =
    event?.acceptedRegistrationCount ?? ('memberCount' in item ? item.memberCount : null);

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-xs transition-[box-shadow,translate,border-color] duration-(--motion-duration-base) ease-(--motion-ease-standard) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background">
      <div className="relative grid aspect-video place-items-center overflow-hidden bg-primary-soft text-primary-soft-text">
        {failedCover === cover ? (
          <CoverIcon aria-hidden="true" className="size-10" strokeWidth={1.75} />
        ) : (
          <img
            alt=""
            className="aspect-video h-full w-full object-cover"
            decoding="async"
            height={675}
            loading="lazy"
            onError={() => setFailedCover(cover)}
            src={cover}
            width={1200}
          />
        )}
        {firstCategory ? (
          <div className="absolute start-3 top-3 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-card" variant="outline">
              {localizedName(firstCategory, i18n.language)}
            </Badge>
            {otherCategories.length > 0 ? (
              <Badge
                className="bg-card"
                title={otherCategories
                  .map((category) => localizedName(category, i18n.language))
                  .join(', ')}
                variant="neutral"
              >
                +{otherCategories.length}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid flex-1 content-start gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">
          <Link
            className="rounded-sm transition-colors group-hover:text-primary-soft-text focus-visible:outline-none after:absolute after:inset-0 after:rounded-(--shape-radius-card) after:content-['']"
            to={`/${kind}/${item.slug}`}
          >
            {localizedResourceTitle(item)}
          </Link>
        </h3>
        {event && date ? (
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted">
            <span>
              {date.weekday}, {date.month} {date.day}
            </span>
            <span aria-hidden="true">·</span>
            <span>{date.time}</span>
          </p>
        ) : null}
        {event && !event.cancelled ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={remaining === 0 ? 'warning' : remaining === null ? 'neutral' : 'primary'}>
              {remaining === null
                ? t('eventUnlimitedCapacity')
                : remaining === 0
                  ? t('eventFullWaitlist')
                  : t('eventPlacesLeft', { count: remaining })}
            </Badge>
            {event.admissionMode === 'approval' ? (
              <Badge variant="neutral">{t('eventApprovalRequired')}</Badge>
            ) : null}
          </div>
        ) : null}
        <div className="mt-auto grid gap-2 border-t border-border pt-3 text-xs text-text-subtle">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UsersRound aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{item.hostName}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {event?.online ? (
                <Video aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              )}
              <span className="truncate">
                {event?.online ? t('online') : (item.cityName ?? '')}
              </span>
            </span>
            {event?.cancelled ? (
              <Badge className="ms-auto" variant="danger">
                {t('cancelled')}
              </Badge>
            ) : null}
          </div>
          {attendeeCount !== null ? (
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="flex -space-x-1.5">
                {[
                  'bg-primary-soft text-primary-soft-text',
                  'bg-surface-soft text-text-muted',
                  'bg-warning-soft text-warning',
                ].map((tone) => (
                  <span
                    className={`grid size-6 place-items-center rounded-full border-2 border-card ${tone}`}
                    key={tone}
                  >
                    <UsersRound className="size-3.5" />
                  </span>
                ))}
              </span>
              <span className="text-sm font-semibold text-text">
                {event
                  ? t('eventRegisteredCount', { count: attendeeCount })
                  : t('communityMemberCount', { count: attendeeCount })}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

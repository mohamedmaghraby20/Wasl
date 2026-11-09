import { CalendarDays, Clock3, MapPin, UsersRound, Video } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  localizedName,
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
  const cover = '/images/community-covers/' + kind + '-abstract.svg';
  const [failedCover, setFailedCover] = useState<string>();
  const CoverIcon = event ? CalendarDays : UsersRound;
  const remaining =
    event?.capacity == null ? null : Math.max(0, event.capacity - event.acceptedRegistrationCount);
  const attendeeCount =
    event?.acceptedRegistrationCount ?? ('memberCount' in item ? item.memberCount : null);
  const hostInitials = item.hostName
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? '')
    .join('');

  return (
    <article
      data-card
      className="group @container relative flex h-full min-w-0 flex-col overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-(--shadow-card) transition-[box-shadow,translate] duration-(--motion-duration-base) ease-(--motion-ease-standard) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) motion-reduce:transform-none motion-reduce:transition-none has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background"
    >
      <div className={`flex flex-1 flex-col ${event ? '@lg:flex-row' : ''}`}>
        <div
          className={`relative grid place-items-center overflow-hidden bg-primary-soft text-primary-soft-text ${event ? 'h-20 shrink-0 @lg:h-auto @lg:w-1/4' : 'h-(--community-cover-height)'}`}
        >
          {failedCover === cover ? (
            <CoverIcon aria-hidden="true" className="size-10" strokeWidth={1.75} />
          ) : (
            <img
              alt=""
              className={`h-full w-full object-cover ${event ? 'absolute inset-0' : ''}`}
              decoding="async"
              height={675}
              loading="lazy"
              onError={() => setFailedCover(cover)}
              src={cover}
              width={1200}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`grid flex-1 gap-3 ${date ? 'p-3 @sm:grid-cols-[3.5rem_minmax(0,1fr)] @lg:grid-cols-[4.5rem_minmax(0,1fr)] @lg:p-4' : 'p-(--card-padding)'}`}
          >
            {date ? (
              <div className="hidden min-h-16 flex-col @sm:flex items-center justify-center self-start rounded-(--shape-radius-control) border border-border bg-surface-soft">
                <span className="text-base font-bold text-text-muted">{date.month}</span>
                <strong className="text-3xl leading-tight">{date.day}</strong>
              </div>
            ) : null}
            <div className="min-w-0">
              {firstCategory ? (
                <p
                  className={`font-bold text-text-muted ${event ? 'text-base @sm:text-lg' : 'text-xs'}`}
                  title={otherCategories
                    .map((category) => localizedName(category, i18n.language))
                    .join(', ')}
                >
                  {localizedName(firstCategory, i18n.language)}
                  {otherCategories.length > 0 ? ` +${otherCategories.length}` : null}
                </p>
              ) : null}
              <h3
                className={`mt-1 font-extrabold leading-tight tracking-tight ${event ? 'break-words text-2xl @sm:text-[1.6875rem]' : 'line-clamp-2 text-lg'}`}
              >
                <Link
                  className="rounded-sm transition-colors group-hover:text-primary-soft-text focus-visible:outline-none after:absolute after:inset-0 after:rounded-(--shape-radius-card) after:content-['']"
                  to={`/${kind}/${item.slug}`}
                >
                  {localizedResourceTitle(item)}
                </Link>
              </h3>
              {event && date ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-base text-text-muted @sm:text-lg">
                  <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                  <span>
                    {date.weekday}, {date.month} {date.day}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{date.time}</span>
                </p>
              ) : null}
              {!event && item.description ? (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">
                  {item.description}
                </p>
              ) : null}
              <p
                className={`flex items-start gap-2 text-text-muted ${event ? 'mt-1 text-base @sm:text-lg' : 'mt-2 text-xs'}`}
              >
                {event?.online ? (
                  <Video aria-hidden="true" className="size-4 shrink-0" />
                ) : (
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                )}
                <span className={event ? 'min-w-0 break-words' : 'truncate'}>
                  {event?.online ? (
                    t('online')
                  ) : (
                    <>
                      {event?.locationName ? (
                        <>
                          {event.locationName}
                          {item.cityName ? ', ' : ''}
                        </>
                      ) : null}
                      <span>{item.cityName}</span>
                    </>
                  )}
                </span>
              </p>
              {event && !event.cancelled ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    className="py-0.5 text-base leading-snug @sm:text-lg"
                    variant={
                      remaining === 0 ? 'warning' : remaining === null ? 'neutral' : 'primary'
                    }
                  >
                    {remaining === null
                      ? t('eventUnlimitedCapacity')
                      : remaining === 0
                        ? t('eventFullWaitlist')
                        : t('eventPlacesLeft', { count: remaining })}
                  </Badge>
                  {event.admissionMode === 'approval' ? (
                    <Badge className="py-0.5 text-base leading-snug @sm:text-lg" variant="neutral">
                      {t('eventApprovalRequired')}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
              {event?.cancelled ? (
                <Badge className="mt-2 py-0.5 text-base leading-snug @sm:text-lg" variant="danger">
                  {t('cancelled')}
                </Badge>
              ) : null}
            </div>
          </div>
          <div
            dir="ltr"
            className={`mt-auto grid items-center gap-2 border-t border-border text-text-muted ${event ? 'px-3 py-2 text-base @xs:grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto] px-(--card-padding) py-4 text-xs'}`}
          >
            <div dir={i18n.dir()} className="flex min-w-0 items-center gap-2">
              {event ? (
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-(--shape-radius-control) border-2 border-surface bg-[#e8f2c8] text-[0.55rem] font-bold leading-none text-[#53662e]"
                >
                  {hostInitials || <UsersRound className="size-3" />}
                </span>
              ) : (
                <UsersRound aria-hidden="true" className="size-4 shrink-0" />
              )}
              {attendeeCount !== null ? (
                <span className="min-w-0 text-text-muted">
                  {event
                    ? t('eventRegisteredCount', { count: attendeeCount })
                    : t('communityMemberCount', { count: attendeeCount })}
                </span>
              ) : null}
            </div>
            <Button
              asChild
              className={`relative z-10 px-(--button-padding-inline-sm) ${event ? 'justify-self-start text-base @sm:text-lg' : 'h-(--control-height-sm) text-xs pointer-coarse:h-11'}`}
              size="sm"
              variant="outline"
            >
              <Link to={`/${kind}/${item.slug}`}>
                {t(event ? 'viewResource' : 'exploreCommunity')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

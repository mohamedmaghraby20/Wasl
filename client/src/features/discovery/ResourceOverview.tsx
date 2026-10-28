import { CalendarDays, MapPin, Ticket, UsersRound, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Badge } from '@/components/ui/Badge';
import { formatTurkeyDateTime, localizedName, localizedResourceTitle } from '@/features/resources/resource-utils';

export function ResourceOverview({
  item, hostPath, admissionLabel,
}: {
  item: CommunityPublicDto | EventPublicDto;
  hostPath?: string | undefined;
  admissionLabel: string;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const event = 'startsAt' in item ? item : undefined;
  return <>
    <header className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-3">
        {item.categories.length > 0 ? <ul aria-label={t('categoriesLabel')} className="flex flex-wrap gap-1.5">
          {item.categories.map((category) => <li key={category.id}><Badge variant="primary">{localizedName(category, i18n.language)}</Badge></li>)}
        </ul> : null}
        <h1 className="text-3xl font-extrabold sm:text-4xl">{localizedResourceTitle(item)}</h1>
        <p className="text-sm text-text-muted"><span>{t('hostedByLabel')} </span>
          {hostPath ? <Link className="font-semibold text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary" to={hostPath}>{item.hostName}</Link> : <span className="font-medium text-text">{item.hostName}</span>}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{item.description}</p>
      {event ? <div className="flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary-soft-text">
        <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="grid gap-0.5 text-sm"><p className="font-semibold">{formatTurkeyDateTime(event.startsAt, i18n.language, 'full')}</p>
          {event.endsAt ? <p className="text-xs opacity-80">{t('endsAt', { date: formatTurkeyDateTime(event.endsAt, i18n.language, 'full') })}</p> : null}
        </div>
      </div> : null}
      {event?.cancelled ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="status">{t('cancelledMessage')}</p> : null}
    </header>
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="grid content-start gap-1 rounded-(--shape-radius-card) border border-border bg-card p-4">
        <p className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle">{event?.online ? <Video aria-hidden="true" className="size-3.5 shrink-0" /> : <MapPin aria-hidden="true" className="size-3.5 shrink-0" />}{event ? t('detailLocation') : t('detailCity')}</p>
        <p className="text-sm font-medium text-text">{event?.online ? t('online') : event?.locationName ? `${event.locationName}, ${item.cityName ?? ''}`.replace(/, $/, '') : item.cityName}</p>
      </div>
      {!event?.cancelled ? <div className="grid content-start gap-1 rounded-(--shape-radius-card) border border-border bg-card p-4"><p className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle"><Ticket aria-hidden="true" className="size-3.5 shrink-0" />{t('detailAdmission')}</p><p className="text-sm font-medium text-text">{t(admissionLabel)}</p></div> : null}
      {item.capacity !== undefined && item.capacity !== null ? <div className="grid content-start gap-1 rounded-(--shape-radius-card) border border-border bg-card p-4"><p className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle"><UsersRound aria-hidden="true" className="size-3.5 shrink-0" />{t('capacityLabel')}</p><p className="text-sm font-medium text-text">{t('capacityValue', { capacity: item.capacity })}</p></div> : null}
    </section>
  </>;
}

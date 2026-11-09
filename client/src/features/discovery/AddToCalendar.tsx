import { CalendarPlus, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Button, buttonVariants } from '@/components/ui/Button';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function utcStamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Google Calendar and .ics links built from the event's existing public fields. */
export function AddToCalendar({ event }: { event: EventPublicDto }): React.JSX.Element {
  const { t } = useTranslation();
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const location = event.online
    ? t('online')
    : [event.locationName, event.cityName].filter(Boolean).join(', ');
  const title = event.title;

  const googleHref = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: event.description,
    location,
  }).toString()}`;

  const downloadIcs = (): void => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wasl//Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@wasl`,
      `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(event.description)}`,
      `LOCATION:${escapeIcs(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `wasl-${event.slug}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-2">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle">
        {t('addToCalendar')}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
          href={googleHref}
          rel="noreferrer"
          target="_blank"
        >
          <CalendarPlus aria-hidden="true" />
          {t('googleCalendar')}
        </a>
        <Button onClick={downloadIcs} size="sm" type="button" variant="outline">
          <Download aria-hidden="true" />
          {t('downloadCalendarFile')}
        </Button>
      </div>
    </div>
  );
}

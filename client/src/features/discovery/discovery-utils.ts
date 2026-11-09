export const DISCOVERY_PAGE_SIZE = 12;
export const DISCOVERY_EVENT_PAGE_SIZE = 24;

export type DateRangePreset = 'today' | 'weekend' | 'next-7-days';

/** Calendar date in Türkiye time, offset by whole days, as YYYY-MM-DD. */
function turkeyDate(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + offsetDays)).toISOString().slice(0, 10);
}

/** Inclusive date range for the discovery quick filters, in Türkiye time. */
export function turkeyDateRange(preset: DateRangePreset): { from: string; to: string } {
  const today = turkeyDate();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'next-7-days') return { from: today, to: turkeyDate(6) };
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (weekday === 0) return { from: today, to: today };
  const daysToSaturday = (6 - weekday + 7) % 7;
  return { from: turkeyDate(daysToSaturday), to: turkeyDate(daysToSaturday + 1) };
}

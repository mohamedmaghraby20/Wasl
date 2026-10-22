export function fromTurkeyDateTime(value?: string | null): string {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const field = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${field('year')}-${field('month')}-${field('day')}T${field('hour')}:${field('minute')}`;
}

export function toTurkeyIso(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}

export function parseCapacity(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

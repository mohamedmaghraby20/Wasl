import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';

export type ResourceKind = 'communities' | 'events';
export type LanguageCode = 'en' | 'ar' | 'tr';

const communityCoverThemes = new Map([
  ['books', 'learning'],
  ['education', 'learning'],
  ['technology', 'learning'],
  ['business', 'learning'],
  ['travel', 'outdoors'],
  ['sports', 'outdoors'],
  ['environment', 'outdoors'],
  ['health', 'outdoors'],
  ['arts', 'creative'],
  ['music', 'creative'],
  ['photography', 'creative'],
  ['gaming', 'creative'],
  ['food', 'food'],
]);

/** Use the first matching interest, with a general illustration for other communities. */
export function defaultCommunityCover(categories: CommunityPublicDto['categories']): string {
  for (const { id } of categories) {
    const theme = communityCoverThemes.get(id);
    if (theme) return `/images/community-covers/${theme}.svg`;
  }
  return '/images/community-covers/social.svg';
}

/** Bundled artwork for compact resource thumbnails. */
export function defaultResourceCover(id: string, kind: ResourceKind): string {
  if (kind === 'communities') return defaultCommunityCover([]);

  const covers = ['conversation', 'gathering', 'together'];
  const hash = Array.from(id).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return `/images/community-covers/${covers[hash % covers.length]}.jpg`;
}

export function languageCode(language: string): LanguageCode {
  if (language.startsWith('ar')) return 'ar';
  if (language.startsWith('tr')) return 'tr';
  return 'en';
}

export function localizedResourceTitle(item: CommunityPublicDto | EventPublicDto): string {
  return 'name' in item ? item.name : item.title;
}

export function localizedName(
  value: { nameEn: string; nameAr: string; nameTr: string },
  language: string,
): string {
  if (language.startsWith('ar')) return value.nameAr;
  if (language.startsWith('tr')) return value.nameTr;
  return value.nameEn;
}

/** Google Maps search URL for a free-text place or address; null when empty. */
export function googleMapsUrl(query: string | null | undefined): string | null {
  const text = query?.trim();
  return text
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
    : null;
}

export function formatTurkeyDateTime(
  value: string,
  language: string,
  dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle,
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

/** Calendar pieces for card headers, always rendered in Türkiye time. */
export function turkeyDateParts(
  value: string,
  language: string,
): { day: string; month: string; weekday: string; time: string } {
  const date = new Date(value);
  const part = (options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(language, { ...options, timeZone: 'Europe/Istanbul' }).format(date);
  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
    time: part({ hour: '2-digit', minute: '2-digit' }),
  };
}

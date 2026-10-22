import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';

export type ResourceKind = 'communities' | 'events';
export type LanguageCode = 'en' | 'ar' | 'tr';

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

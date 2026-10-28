import { useHead, useSeoMeta } from '@unhead/react';
import { useLocation } from 'react-router';

export function usePageMetadata(
  title: string,
  description: string,
  options?: {
    canonicalPath?: string;
    noindex?: boolean;
    structuredData?: Record<string, unknown>;
  },
): void {
  const { pathname } = useLocation();
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    robots: options?.noindex ? 'noindex, nofollow' : 'index, follow',
  });
  useHead({
    link: options?.noindex
      ? []
      : [{ rel: 'canonical', href: `${window.location.origin}${options?.canonicalPath ?? pathname}` }],
    script: options?.structuredData
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(options.structuredData).replace(/</g, '\\u003c'),
          },
        ]
      : [],
  });
}

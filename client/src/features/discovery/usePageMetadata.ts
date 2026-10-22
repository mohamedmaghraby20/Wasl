import { useHead, useSeoMeta } from '@unhead/react';

export function usePageMetadata(
  title: string,
  description: string,
  options?: {
    canonicalPath?: string;
    noindex?: boolean;
    structuredData?: Record<string, unknown>;
  },
): void {
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    robots: options?.noindex ? 'noindex, nofollow' : 'index, follow',
  });
  useHead({
    link: options?.canonicalPath
      ? [{ rel: 'canonical', href: `${window.location.origin}${options.canonicalPath}` }]
      : [],
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

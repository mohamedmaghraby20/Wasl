import { useHead } from '@unhead/react';
import { BadgeCheck, Building2, ExternalLink, Globe2, MapPin, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import {
  useOrganizationsControllerMine,
  useOrganizationsControllerPublicProfile,
} from '@/api/generated/organizations/organizations';
import { ApiError } from '@/api/fetcher';
import { QueryError } from '@/components/feedback/QueryError';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

function safeExternalUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function OrganizationProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { slug = '' } = useParams();
  const profile = useOrganizationsControllerPublicProfile(
    slug,
    { lang: languageCode(i18n.language) },
    { query: { enabled: Boolean(slug) } },
  );
  const mine = useOrganizationsControllerMine({ query: { enabled: Boolean(user) } });
  const organization = profile.data;
  const canManage = Boolean(organization && mine.data?.some((item) => item.id === organization.id));
  useHead({
    title: organization?.name ?? t('organizationProfileTitle'),
    meta: [
      { name: 'description', content: organization?.description ?? t('organizationProfileIntro') },
    ],
    link: [{ rel: 'canonical', href: `${window.location.origin}/organizations/${slug}` }],
  });

  if (profile.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingOrganization')}
      </p>
    );
  if (profile.isError) {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      return (
        <p className="rounded-(--shape-radius-card) border border-border bg-card p-5" role="alert">
          {t('organizationNotFound')}
        </p>
      );
    }
    return (
      <QueryError message={t('organizationLoadError')} onRetry={() => void profile.refetch()} />
    );
  }
  if (!organization)
    return (
      <p className="rounded-(--shape-radius-card) border border-border bg-card p-5" role="alert">
        {t('organizationNotFound')}
      </p>
    );

  const location = [organization.locationName, organization.cityName].filter(Boolean).join(', ');
  const websiteUrl = safeExternalUrl(organization.websiteUrl);
  const socialUrl = safeExternalUrl(organization.socialUrl);
  const resources = {
    communities: organization.resources.filter((resource) => resource.kind === 'community'),
    events: organization.resources.filter((resource) => resource.kind === 'event'),
  };

  return (
    <article className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="flex flex-wrap items-center gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
        {organization.logoUrl ? (
          <img
            alt=""
            className="size-24 shrink-0 rounded-(--shape-radius-card) border border-border bg-card object-cover"
            src={organization.logoUrl}
          />
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-(--shape-radius-card) border border-border bg-primary-soft text-primary-soft-text">
            <Building2 aria-hidden="true" size={38} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            {organization.type}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="break-words text-3xl font-extrabold">{organization.name}</h1>
            <Badge
              variant={organization.verificationStatus === 'VERIFIED' ? 'success' : 'neutral'}
            >
              {organization.verificationStatus === 'VERIFIED' ? (
                <BadgeCheck aria-hidden="true" />
              ) : null}
              {t(`organizationVerification_${organization.verificationStatus}`)}
            </Badge>
          </div>
          {location ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-text-muted">
              <MapPin aria-hidden="true" className="size-4" />
              {location}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link to={`/organizations/${organization.slug}/manage`}>
              <Settings2 aria-hidden="true" />
              {t('manageOrganization')}
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
        <section className="grid gap-1.5">
          <h2 className="text-sm font-semibold">{t('organizationAbout')}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
            {organization.description}
          </p>
        </section>

        {websiteUrl || socialUrl ? (
          <section className="grid gap-2 border-t border-border pt-4">
            <h2 className="text-sm font-semibold">{t('organizationLinks')}</h2>
            <ul className="flex flex-wrap gap-2">
              {websiteUrl ? (
                <li>
                  <a
                    className="inline-flex h-10 items-center gap-2 rounded-(--shape-radius-control) border border-border bg-background px-3.5 text-sm font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-soft"
                    href={websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Globe2 aria-hidden="true" className="size-4 text-text-subtle" />
                    {t('organizationWebsite')}
                    <ExternalLink aria-hidden="true" className="size-3.5 text-text-subtle" />
                  </a>
                </li>
              ) : null}
              {socialUrl ? (
                <li>
                  <a
                    className="inline-flex h-10 items-center gap-2 rounded-(--shape-radius-control) border border-border bg-background px-3.5 text-sm font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-soft"
                    href={socialUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Globe2 aria-hidden="true" className="size-4 text-text-subtle" />
                    {t('organizationSocial')}
                    <ExternalLink aria-hidden="true" className="size-3.5 text-text-subtle" />
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
      </div>

      <section className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
        <h2 className="text-lg font-semibold">{t('organizationPublicResources')}</h2>
        {organization.resources.length ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {(['communities', 'events'] as const).map((kind) =>
              resources[kind].length ? (
                <section className="grid content-start gap-2" key={kind}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    {t(kind)}
                  </h3>
                  <ul className="grid gap-2">
                    {resources[kind].map((resource) => (
                      <li key={`${resource.kind}-${resource.slug}`}>
                        <Link
                          className="block rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-soft"
                          to={`/${kind}/${resource.slug}`}
                        >
                          {resource.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">{t('organizationResourcesEmpty')}</p>
        )}
      </section>
    </article>
  );
}

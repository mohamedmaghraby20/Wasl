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

  if (profile.isPending) return <p role="status">{t('loadingOrganization')}</p>;
  if (profile.isError) {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      return <p role="alert">{t('organizationNotFound')}</p>;
    }
    return (
      <QueryError message={t('organizationLoadError')} onRetry={() => void profile.refetch()} />
    );
  }
  if (!organization) return <p role="alert">{t('organizationNotFound')}</p>;

  const location = [organization.locationName, organization.cityName].filter(Boolean).join(', ');
  const websiteUrl = safeExternalUrl(organization.websiteUrl);
  const socialUrl = safeExternalUrl(organization.socialUrl);
  const resources = {
    communities: organization.resources.filter((resource) => resource.kind === 'community'),
    events: organization.resources.filter((resource) => resource.kind === 'event'),
  };

  return (
    <article className="mx-auto max-w-(--container-reading) space-y-8">
      <header className="grid gap-5 border-b border-border pb-7 sm:grid-cols-[9rem_1fr] sm:items-center">
        {organization.logoUrl ? (
          <img
            alt=""
            className="size-32 rounded-(--shape-radius-card) border border-border bg-card object-cover"
            src={organization.logoUrl}
          />
        ) : (
          <div className="grid size-32 place-items-center rounded-(--shape-radius-card) border border-border bg-primary-soft text-primary-soft-text">
            <Building2 aria-hidden="true" size={48} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{organization.type}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="break-words font-heading text-3xl font-bold tracking-tight">
              {organization.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${organization.verificationStatus === 'VERIFIED' ? 'bg-primary-soft text-primary-soft-text' : 'bg-secondary text-muted-foreground'}`}
            >
              {organization.verificationStatus === 'VERIFIED' && (
                <BadgeCheck aria-hidden="true" size={16} />
              )}
              {t(`organizationVerification_${organization.verificationStatus}`)}
            </span>
          </div>
          {location && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" size={17} />
              {location}
            </p>
          )}
          {canManage && (
            <Link
              className="mt-4 inline-flex min-h-(--control-height-md) items-center gap-2 rounded-(--shape-radius-control) border border-border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
              to={`/organizations/${organization.slug}/manage`}
            >
              <Settings2 aria-hidden="true" size={16} />
              {t('manageOrganization')}
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-2">
        <h2 className="font-heading text-lg font-semibold">{t('organizationAbout')}</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {organization.description}
        </p>
      </section>

      {(websiteUrl || socialUrl) && (
        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('organizationLinks')}</h2>
          <ul className="flex flex-wrap gap-3">
            {websiteUrl && (
              <li>
                <a
                  className="inline-flex min-h-(--control-height-md) items-center gap-2 rounded-(--shape-radius-control) border border-border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
                  href={websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe2 aria-hidden="true" size={17} />
                  {t('organizationWebsite')}
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              </li>
            )}
            {socialUrl && (
              <li>
                <a
                  className="inline-flex min-h-(--control-height-md) items-center gap-2 rounded-(--shape-radius-control) border border-border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
                  href={socialUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe2 aria-hidden="true" size={17} />
                  {t('organizationSocial')}
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="grid gap-4 border-t border-border pt-7">
        <h2 className="font-heading text-lg font-semibold">{t('organizationPublicResources')}</h2>
        {organization.resources.length ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {(['communities', 'events'] as const).map((kind) =>
              resources[kind].length ? (
                <section className="grid content-start gap-2" key={kind}>
                  <h3 className="text-sm font-semibold text-muted-foreground">{t(kind)}</h3>
                  <ul className="grid gap-2">
                    {resources[kind].map((resource) => (
                      <li key={`${resource.kind}-${resource.slug}`}>
                        <Link
                          className="block rounded-(--shape-radius-control) border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
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
          <p className="text-sm text-muted-foreground">{t('organizationResourcesEmpty')}</p>
        )}
      </section>
    </article>
  );
}

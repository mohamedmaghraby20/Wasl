import { Waypoints } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export function AppFooter(): React.JSX.Element {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-(--container-max) gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Link className="inline-flex items-center gap-2.5" to="/">
            <span className="grid size-9 place-items-center rounded-[0.7rem] bg-primary text-primary-foreground">
              <Waypoints aria-hidden="true" className="size-4.5" />
            </span>
            <span className="font-heading text-lg font-extrabold tracking-tight">{t('brand')}</span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-text-muted">{t('starter')}</p>
        </div>
        <nav aria-label={t('resourceTypesNavigation')} className="grid content-start gap-2 text-sm">
          <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-text-subtle">
            {t('discover')}
          </p>
          <Link className="w-fit text-text-muted hover:text-text" to="/communities">
            {t('communities')}
          </Link>
          <Link className="w-fit text-text-muted hover:text-text" to="/events">
            {t('events')}
          </Link>
          <Link className="w-fit text-text-muted hover:text-text" to="/discover">
            {t('exploreAll')}
          </Link>
        </nav>
        <nav aria-label={t('accountMenu')} className="grid content-start gap-2 text-sm">
          <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-text-subtle">
            {t('create')}
          </p>
          <Link className="w-fit text-text-muted hover:text-text" to="/create/community">
            {t('createCommunityTitle')}
          </Link>
          <Link className="w-fit text-text-muted hover:text-text" to="/create/event">
            {t('createEventTitle')}
          </Link>
          <Link className="w-fit text-text-muted hover:text-text" to="/create/organization">
            {t('createOrganizationTitle')}
          </Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-(--container-max) px-4 py-5 text-xs text-text-subtle sm:px-6">
          {t('footerRights', { year })}
        </p>
      </div>
    </footer>
  );
}

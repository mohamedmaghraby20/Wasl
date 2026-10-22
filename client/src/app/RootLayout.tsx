import { Globe2, Menu, X } from 'lucide-react';
import { useHead } from '@unhead/react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

export function RootLayout(): React.JSX.Element {
  const { t, i18n: activeI18n } = useTranslation();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setNavigationOpen(false), [pathname]);
  const changeLanguage = async (): Promise<void> => {
    await activeI18n.changeLanguage(activeI18n.language.startsWith('en') ? 'ar' : 'en');
  };
  useHead({
    titleTemplate: '%s | Wasl',
    htmlAttrs: {
      lang: activeI18n.language.startsWith('ar') ? 'ar' : 'en',
      dir: activeI18n.language.startsWith('ar') ? 'rtl' : 'ltr',
    },
    link: [{ rel: 'canonical', href: `${window.location.origin}${pathname}` }],
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative border-b border-border bg-card">
        <div className="mx-auto flex min-h-(--layout-header-height) max-w-(--container-max) items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link className="font-heading text-xl font-extrabold tracking-tight" to="/">
            {t('brand')}
          </Link>
          <button
            ref={menuButtonRef}
            aria-controls="primary-navigation"
            aria-expanded={navigationOpen}
            aria-label={t(navigationOpen ? 'closeNavigation' : 'openNavigation')}
            className="min-h-(--control-height-lg) min-w-(--control-height-lg) rounded-md p-2 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring md:hidden"
            onClick={() => setNavigationOpen((open) => !open)}
            type="button"
          >
            {navigationOpen ? (
              <X aria-hidden="true" size={20} />
            ) : (
              <Menu aria-hidden="true" size={20} />
            )}
          </button>
          <nav
            id="primary-navigation"
            aria-label={t('primaryNavigation')}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && navigationOpen) {
                setNavigationOpen(false);
                menuButtonRef.current?.focus();
              }
            }}
            className={`${navigationOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full z-(--z-dropdown) flex-col items-stretch gap-1 border-b border-border bg-card p-3 shadow-(--shadow-popover) md:static md:flex md:flex-row md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          >
            {['home', 'discover', 'communities', 'events'].map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 md:min-h-0 ${isActive ? 'bg-secondary font-semibold' : ''}`
                }
                key={item}
                onClick={() => setNavigationOpen(false)}
                to={item === 'home' ? '/' : `/${item}`}
              >
                {t(item)}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink
                  className={({ isActive }) =>
                    `flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 ${isActive ? 'bg-secondary font-semibold' : ''}`
                  }
                  onClick={() => setNavigationOpen(false)}
                  to="/activity"
                >
                  {t('myActivity')}
                </NavLink>
                <NavLink
                  className={({ isActive }) =>
                    `flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 ${isActive ? 'bg-secondary font-semibold' : ''}`
                  }
                  onClick={() => setNavigationOpen(false)}
                  to="/create"
                >
                  {t('create')}
                </NavLink>
                <NavLink
                  className={({ isActive }) =>
                    `flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 ${isActive ? 'bg-secondary font-semibold' : ''}`
                  }
                  onClick={() => setNavigationOpen(false)}
                  to="/profile"
                >
                  {t('profileTitle')}
                </NavLink>
                <button
                  className="flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring"
                  onClick={() => void signOut().catch(() => toast.error(t('genericError')))}
                  type="button"
                >
                  {t('authSignOut')}
                </button>
              </>
            ) : (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-(--control-height-md) items-center rounded-md px-2 py-1 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 ${isActive ? 'bg-secondary font-semibold' : ''}`
                }
                onClick={() => setNavigationOpen(false)}
                to={{
                  pathname: '/sign-in',
                  search: `?returnTo=${encodeURIComponent(`${pathname}${window.location.search}${window.location.hash}`)}`,
                }}
              >
                {t('authSignIn')}
              </NavLink>
            )}
            <button
              aria-label={t(
                activeI18n.language.startsWith('ar') ? 'switchToEnglish' : 'switchToArabic',
              )}
              className="flex min-h-(--control-height-md) min-w-(--control-height-md) items-center justify-center rounded-md p-2 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring"
              onClick={() => {
                setNavigationOpen(false);
                void changeLanguage();
              }}
              type="button"
            >
              <Globe2 aria-hidden="true" size={18} />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-(--container-max) px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

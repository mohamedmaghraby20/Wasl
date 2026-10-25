import {
  Bell,
  CalendarCheck,
  Globe2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  UserRound,
  Waypoints,
  X,
} from 'lucide-react';
import { useHead } from '@unhead/react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';
import { AppFooter } from '@/components/layout/AppFooter';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';

const primaryLinks = [
  { key: 'home', to: '/', end: true },
  { key: 'discover', to: '/discover', end: false },
  { key: 'communities', to: '/communities', end: false },
  { key: 'events', to: '/events', end: false },
] as const;

const accountLinks = [
  { key: 'create', to: '/create', icon: Plus },
  { key: 'myActivity', to: '/activity', icon: CalendarCheck },
  { key: 'notifications', to: '/notifications', icon: Bell },
  { key: 'messages', to: '/messages', icon: MessageSquare },
  { key: 'profileTitle', to: '/profile', icon: UserRound },
] as const;

function Brand(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Link
      className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md"
      to="/"
      aria-label={t('brand')}
    >
      <span className="grid size-9 place-items-center rounded-[0.7rem] bg-primary text-primary-foreground shadow-xs">
        <Waypoints aria-hidden="true" className="size-[1.15rem]" />
      </span>
      <span className="font-heading text-lg font-extrabold tracking-tight">{t('brand')}</span>
    </Link>
  );
}

const navItemClass = (isActive: boolean): string =>
  cn(
    'relative flex h-11 items-center rounded-(--shape-radius-control) px-3.5 text-sm font-medium transition-colors duration-(--motion-duration-fast)',
    isActive
      ? 'bg-primary-soft text-primary-soft-text'
      : 'text-text-muted hover:bg-surface-soft hover:text-text',
  );

export function RootLayout(): React.JSX.Element {
  const { t, i18n: activeI18n } = useTranslation();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);
  useEffect(() => setNavigationOpen(false), [pathname]);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    // Let a closing navigation sheet restore its trigger before moving focus.
    const timeout = window.setTimeout(() => {
      mainRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);
  const isArabic = activeI18n.language.startsWith('ar');
  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    '';
  const initial = displayName.slice(0, 1).toUpperCase() || '?';
  const changeLanguage = async (): Promise<void> => {
    setNavigationOpen(false);
    await activeI18n.changeLanguage(isArabic ? 'en' : 'ar');
  };
  useHead({
    titleTemplate: '%s | Wasl',
    htmlAttrs: { lang: isArabic ? 'ar' : 'en', dir: isArabic ? 'rtl' : 'ltr' },
    link: [{ rel: 'canonical', href: `${window.location.origin}${pathname}` }],
  });
  const languageLabel = t(isArabic ? 'switchToEnglish' : 'switchToArabic');
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        className="sr-only z-(--z-toast) rounded-md bg-card px-3 py-2 text-sm font-semibold shadow-lg focus:not-sr-only focus:fixed focus:start-4 focus:top-3"
        href="#main-content"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-(--z-sticky) border-b border-border/80 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-(--container-max) items-center gap-4 px-4 sm:px-6">
          <Brand />
          <nav
            aria-label={t('primaryNavigation')}
            className="ms-2 hidden items-center gap-0.5 md:flex"
          >
            {primaryLinks.map((item) => (
              <NavLink
                className={({ isActive }) => navItemClass(isActive)}
                end={item.end}
                key={item.key}
                to={item.to}
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <Button
              aria-label={languageLabel}
              className="hidden md:inline-flex"
              onClick={() => void changeLanguage()}
              size="icon"
              title={languageLabel}
              variant="ghost"
            >
              <Globe2 aria-hidden="true" />
            </Button>
            {user ? (
              <>
                <Button asChild className="hidden sm:inline-flex" variant="secondary">
                  <Link to="/create">
                    <Plus aria-hidden="true" />
                    {t('create')}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={t('accountMenu')}
                      className="grid size-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-text transition-shadow hover:ring-2 hover:ring-primary/40"
                      type="button"
                    >
                      {initial}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60">
                    <DropdownMenuLabel className="truncate text-text">
                      {displayName || t('profileTitle')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {accountLinks.map((item) => (
                      <DropdownMenuItem asChild key={item.key}>
                        <Link to={item.to}>
                          <item.icon aria-hidden="true" />
                          {t(item.key)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-danger [&_svg]:text-danger"
                      onSelect={() => void signOut().catch(() => toast.error(t('genericError')))}
                    >
                      <LogOut aria-hidden="true" />
                      {t('authSignOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild>
                <Link
                  to={{
                    pathname: '/sign-in',
                    search: `?returnTo=${encodeURIComponent(`${pathname}${window.location.search}${window.location.hash}`)}`,
                  }}
                >
                  {t('authSignIn')}
                </Link>
              </Button>
            )}
            <Sheet onOpenChange={setNavigationOpen} open={navigationOpen}>
              <SheetTrigger asChild>
                <Button
                  aria-label={t(navigationOpen ? 'closeNavigation' : 'openNavigation')}
                  className="md:hidden"
                  size="icon"
                  variant="ghost"
                >
                  {navigationOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                </Button>
              </SheetTrigger>
              <SheetContent
                className="max-w-xs gap-1"
                closeLabel={t('closeNavigation')}
                side={isArabic ? 'start' : 'end'}
              >
                <SheetTitle className="mb-2 px-1">
                  <Brand />
                </SheetTitle>
                <nav aria-label={t('primaryNavigation')} className="grid gap-1">
                  {primaryLinks.map((item) => (
                    <SheetClose asChild key={item.key}>
                      <NavLink
                        className={({ isActive }) =>
                          cn(
                            'flex h-11 items-center rounded-(--shape-radius-control) px-3 text-[0.95rem] font-medium transition-colors',
                            isActive
                              ? 'bg-primary-soft text-primary-soft-text'
                              : 'text-text hover:bg-surface-soft',
                          )
                        }
                        end={item.end}
                        to={item.to}
                      >
                        {t(item.key)}
                      </NavLink>
                    </SheetClose>
                  ))}
                </nav>
                <div className="my-2 h-px bg-border" />
                <nav aria-label={t('accountMenu')} className="grid gap-1">
                  {user ? (
                    <>
                      {accountLinks.map((item) => (
                        <SheetClose asChild key={item.key}>
                          <NavLink
                            className={({ isActive }) =>
                              cn(
                                'flex h-11 min-w-0 items-center gap-3 rounded-(--shape-radius-control) px-3 text-[0.95rem] font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-subtle',
                                isActive
                                  ? 'bg-surface-soft text-text'
                                  : 'text-text-muted hover:bg-surface-soft hover:text-text',
                              )
                            }
                            to={item.to}
                          >
                            <item.icon aria-hidden="true" />
                            <span className="min-w-0 truncate">{t(item.key)}</span>
                          </NavLink>
                        </SheetClose>
                      ))}
                      <button
                        className="flex h-11 min-w-0 items-center gap-3 rounded-(--shape-radius-control) px-3 text-start text-[0.95rem] font-medium text-danger transition-colors hover:bg-danger-soft [&_svg]:size-4 [&_svg]:shrink-0"
                        onClick={() => {
                          setNavigationOpen(false);
                          void signOut().catch(() => toast.error(t('genericError')));
                        }}
                        type="button"
                      >
                        <LogOut aria-hidden="true" />
                        <span className="min-w-0 truncate">{t('authSignOut')}</span>
                      </button>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <NavLink
                        className="flex h-11 items-center rounded-(--shape-radius-control) bg-primary px-3 text-[0.95rem] font-semibold text-primary-foreground"
                        to={{
                          pathname: '/sign-in',
                          search: `?returnTo=${encodeURIComponent(`${pathname}${window.location.search}${window.location.hash}`)}`,
                        }}
                      >
                        {t('authSignIn')}
                      </NavLink>
                    </SheetClose>
                  )}
                </nav>
                <div className="mt-auto grid gap-1 pt-4">
                  <button
                    aria-label={languageLabel}
                    className="flex h-11 min-w-0 items-center gap-3 rounded-(--shape-radius-control) px-3 text-[0.95rem] font-medium text-text-muted transition-colors hover:bg-surface-soft hover:text-text [&_svg]:size-4 [&_svg]:shrink-0"
                    onClick={() => void changeLanguage()}
                    type="button"
                  >
                    <Globe2 aria-hidden="true" />
                    <span className="min-w-0 truncate">{languageLabel}</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-(--container-max) flex-1 px-4 py-8 outline-none sm:px-6 sm:py-12"
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <AppFooter />
      <ScrollRestoration />
    </div>
  );
}

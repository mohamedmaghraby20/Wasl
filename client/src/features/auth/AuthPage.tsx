import { useHead } from '@unhead/react';
import { UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { authErrorMessage, useAuth } from './AuthProvider';

export function safeReturnPath(search: string): string {
  const candidate = new URLSearchParams(search).get('returnTo');
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/';
  try {
    const target = new URL(candidate, window.location.origin);
    if (target.origin !== window.location.origin) return '/';
    if (target.pathname === '/sign-in' || target.pathname === '/sign-up') return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

export function AuthPage(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { configured, loading, user, signIn, signUp } = useAuth();
  const isSignUp = location.pathname === '/sign-up';
  const returnTo = safeReturnPath(location.search);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useHead({ title: t(isSignUp ? 'authCreateAccount' : 'authSignIn') });

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (isSignUp) {
        const hasSession = await signUp(displayName.trim(), email.trim(), password, returnTo);
        if (hasSession) void navigate(returnTo, { replace: true });
        else setNotice(t('authConfirmationSent', { email: email.trim() }));
      } else {
        await signIn(email.trim(), password);
        void navigate(returnTo, { replace: true });
      }
    } catch (cause) {
      setError(
        authErrorMessage(cause, {
          invalidCredentials: t('authInvalidCredentials'),
          accountExists: t('authAccountExists'),
          weakPassword: t('authWeakPassword'),
          generic: t('authRequestFailed'),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!loading && user) return <Navigate replace to={returnTo} />;

  return (
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-(--shadow-card) lg:min-h-[38rem] lg:grid-cols-2">
      <aside className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-foreground p-7 text-background sm:p-10 lg:p-12">
        <div className="relative z-10 flex items-center gap-2 font-heading text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <UsersRound aria-hidden="true" size={18} />
          </span>
          {t('brand')}
        </div>
        <div className="relative z-10 max-w-sm py-7">
          <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
            {t('authPanelTitle')}
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/75 sm:text-base">
            {t('authPanelDescription')}
          </p>
        </div>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -end-10 h-64 w-72 opacity-90 sm:h-80 sm:w-96"
          fill="none"
          viewBox="0 0 320 280"
        >
          <path
            d="M8 248C72 248 55 160 124 160S165 58 230 58h78"
            stroke="var(--color-primary)"
            strokeWidth="2"
          />
          <circle cx="8" cy="248" fill="var(--color-primary)" r="6" />
          <circle cx="124" cy="160" fill="var(--color-primary)" r="6" />
          <circle cx="230" cy="58" fill="var(--color-primary)" r="6" />
          <circle cx="286" cy="58" r="22" stroke="var(--color-primary)" strokeOpacity=".4" />
        </svg>
      </aside>

      <div className="flex items-center p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {t(isSignUp ? 'authCreateAccount' : 'authSignIn')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(isSignUp ? 'authCreateDescription' : 'authSignInDescription')}
          </p>

          {!configured ? (
            <p
              className="mt-6 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning"
              role="alert"
            >
              {t('authNotConfigured')}
            </p>
          ) : null}
          {error ? (
            <p
              className="mt-6 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              className="mt-6 rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success"
              role="status"
            >
              {notice}
            </p>
          ) : null}

          <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)}>
            {isSignUp ? (
              <Field id="auth-display-name" label={t('authDisplayName')}>
                <Input
                  autoComplete="name"
                  id="auth-display-name"
                  maxLength={80}
                  minLength={1}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                  required
                  type="text"
                  value={displayName}
                />
              </Field>
            ) : null}
            <Field id="auth-email" label={t('authEmail')}>
              <Input
                autoComplete="email"
                id="auth-email"
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                type="email"
                value={email}
              />
            </Field>
            <Field id="auth-password" label={t('authPassword')}>
              <Input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                id="auth-password"
                minLength={isSignUp ? 8 : undefined}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                type="password"
                value={password}
              />
            </Field>
            <Button
              block
              disabled={!configured || busy || Boolean(notice)}
              type="submit"
            >
              {busy ? t('authWorking') : t(isSignUp ? 'authCreateAccount' : 'authSignIn')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            {t(isSignUp ? 'authHaveAccount' : 'authNeedAccount')}{' '}
            <Link
              className="font-semibold text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
              to={{ pathname: isSignUp ? '/sign-in' : '/sign-up', search: location.search }}
            >
              {t(isSignUp ? 'authSignIn' : 'authCreateAccount')}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

import { useHead } from '@unhead/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useAuth } from './AuthProvider';

export function PasswordResetPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { configured, loading, user, requestPasswordReset, updatePassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const updating = !loading && Boolean(user);

  useHead({ title: t(updating ? 'authChoosePassword' : 'authResetPassword') });

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (updating) await updatePassword(password);
      else await requestPasswordReset(email.trim());
      setComplete(true);
    } catch {
      setError(t(updating ? 'authPasswordUpdateFailed' : 'authResetRequestFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-lg rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-(--shadow-card) sm:p-10">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        {t(updating ? 'authChoosePassword' : 'authResetPassword')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(updating ? 'authChoosePasswordDescription' : 'authResetPasswordDescription')}
      </p>
      {!configured ? (
        <p className="mt-6 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">
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
      {complete ? (
        <p
          className="mt-6 rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success"
          role="status"
        >
          {t(updating ? 'authPasswordUpdated' : 'authResetEmailSent')}
        </p>
      ) : (
        <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)}>
          {updating ? (
            <Field id="reset-password" label={t('authNewPassword')}>
              <Input
                autoComplete="new-password"
                id="reset-password"
                minLength={8}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                type="password"
                value={password}
              />
            </Field>
          ) : (
            <Field id="reset-email" label={t('authEmail')}>
              <Input
                autoComplete="email"
                id="reset-email"
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                type="email"
                value={email}
              />
            </Field>
          )}
          <Button block disabled={!configured || busy || loading} type="submit">
            {busy ? t('authWorking') : t(updating ? 'authSavePassword' : 'authSendResetLink')}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link
          className="font-semibold text-primary-soft-text underline underline-offset-4"
          to="/sign-in"
        >
          {t('authBackToSignIn')}
        </Link>
      </p>
    </section>
  );
}

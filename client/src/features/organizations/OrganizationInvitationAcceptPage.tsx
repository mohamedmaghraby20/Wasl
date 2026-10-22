import { useQueryClient } from '@tanstack/react-query';
import { useHead } from '@unhead/react';
import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  getOrganizationsControllerMineQueryKey,
  useOrganizationsControllerAcceptAdminInvitation,
} from '@/api/generated/organizations/organizations';
import { ApiError } from '@/api/fetcher';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';

export function OrganizationInvitationAcceptPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const accept = useOrganizationsControllerAcceptAdminInvitation();
  const [acceptedSlug, setAcceptedSlug] = useState('');
  const [error, setError] = useState('');

  useHead({ title: t('acceptInvitationTitle') });

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }

  const acceptInvitation = async (): Promise<void> => {
    setError('');
    try {
      const result = await accept.mutateAsync({ data: { token } });
      setAcceptedSlug(result.organizationSlug);
      await queryClient.invalidateQueries({ queryKey: getOrganizationsControllerMineQueryKey() });
      toast.success(t('invitationAccepted'));
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 403
          ? t('acceptInvitationWrongAccount')
          : t('acceptInvitationError'),
      );
    }
  };

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-5 py-6">
      <header className="grid gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {t('acceptInvitationTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('acceptInvitationIntro')}
        </p>
      </header>

      {acceptedSlug ? (
        <div className="grid justify-items-start gap-3 rounded-(--shape-radius-card) border border-border bg-card p-5">
          <p className="flex items-center gap-2 font-semibold text-primary-soft-text">
            <BadgeCheck aria-hidden="true" size={18} />
            {t('invitationAccepted')}
          </p>
          <Button asChild>
            <Link to={`/organizations/${acceptedSlug}/manage`}>{t('goToOrganization')}</Link>
          </Button>
        </div>
      ) : !token ? (
        <p
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {t('invitationTokenMissing')}
        </p>
      ) : (
        <div className="grid justify-items-start gap-3">
          <Button disabled={accept.isPending} onClick={() => void acceptInvitation()}>
            {accept.isPending ? t('acceptingInvitation') : t('acceptInvitationAction')}
          </Button>
          {error && (
            <p
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

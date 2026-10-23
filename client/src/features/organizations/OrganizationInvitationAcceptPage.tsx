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
import { Card } from '@/components/ui/Card';
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
    <section className="mx-auto grid max-w-(--container-reading) gap-6 py-4">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('acceptInvitationTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('acceptInvitationIntro')}</p>
      </header>

      {acceptedSlug ? (
        <Card className="grid justify-items-start gap-4 p-6">
          <p className="flex items-center gap-2 font-semibold text-success">
            <BadgeCheck aria-hidden="true" className="size-5" />
            {t('invitationAccepted')}
          </p>
          <Button asChild>
            <Link to={`/organizations/${acceptedSlug}/manage`}>{t('goToOrganization')}</Link>
          </Button>
        </Card>
      ) : !token ? (
        <p
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          role="alert"
        >
          {t('invitationTokenMissing')}
        </p>
      ) : (
        <Card className="grid justify-items-start gap-4 p-6">
          <Button disabled={accept.isPending} onClick={() => void acceptInvitation()}>
            {accept.isPending ? t('acceptingInvitation') : t('acceptInvitationAction')}
          </Button>
          {error ? (
            <p
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </Card>
      )}
    </section>
  );
}

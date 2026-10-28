import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, Link } from 'react-router';
import { ApiError } from '@/api/fetcher';
import {
  getModerationControllerListQueryKey,
  useModerationControllerDecide,
  useModerationControllerList,
} from '@/api/generated/moderation/moderation';
import {
  getOrganizationsControllerListPendingVerificationRequestsQueryKey,
  useOrganizationsControllerDecideVerification,
  useOrganizationsControllerListPendingVerificationRequests,
} from '@/api/generated/organizations/organizations';
import {
  getPrivacyAdminControllerListQueryKey,
  usePrivacyAdminControllerDecide,
  usePrivacyAdminControllerList,
  usePrivacyAdminControllerRetry,
} from '@/api/generated/privacy/privacy';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';
import { formatTurkeyDateTime } from '@/features/resources/resource-utils';
import { supabase } from '@/lib/supabase';

function SecondFactor({ onSuccess }: { onSuccess: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase?.auth.mfa.listFactors().then(({ data, error: cause }) => {
      if (!active) return;
      if (cause) setError(t('adminMfaError'));
      else if (data?.totp[0]) setFactorId(data.totp[0].id);
    });
    return () => {
      active = false;
    };
  }, [t]);

  const enroll = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: cause } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (cause) throw cause;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch {
      setError(t('adminMfaError'));
    } finally {
      setBusy(false);
    }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !factorId) return;
    setBusy(true);
    setError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const result = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (result.error) throw result.error;
      onSuccess();
    } catch {
      setError(t('adminMfaError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto grid max-w-md gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{t('adminMfaTitle')}</h2>
      <p className="text-sm text-text-muted">{t('adminMfaDescription')}</p>
      {!factorId && (
        <Button disabled={busy} onClick={() => void enroll()}>
          {t('adminMfaEnroll')}
        </Button>
      )}
      {qr && (
        <>
          <img
            alt={t('adminMfaQr')}
            className="size-48"
            src={`data:image/svg+xml,${encodeURIComponent(qr)}`}
          />
          <p className="break-all text-sm">
            {t('adminMfaSecret')}: <code>{secret}</code>
          </p>
        </>
      )}
      {factorId && (
        <form className="grid gap-3" onSubmit={(event) => void verify(event)}>
          <Field id="admin-mfa-code" label={t('adminMfaCode')}>
            <Input
              autoComplete="one-time-code"
              id="admin-mfa-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              onChange={(event) => setCode(event.target.value)}
              pattern="[0-9]{6}"
              required
              value={code}
            />
          </Field>
          <Button disabled={busy} type="submit">
            {t('adminMfaVerify')}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

export function PlatformModerationPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const reports = useModerationControllerList({
    query: { enabled: Boolean(user && aal === 'aal2') },
  });
  const requests = useOrganizationsControllerListPendingVerificationRequests({
    query: { enabled: Boolean(user && aal === 'aal2') },
  });
  const privacyRequests = usePrivacyAdminControllerList(undefined, {
    query: { enabled: Boolean(user && aal === 'aal2') },
  });
  const decide = useModerationControllerDecide();
  const verify = useOrganizationsControllerDecideVerification();
  const decidePrivacy = usePrivacyAdminControllerDecide();
  const retryPrivacy = usePrivacyAdminControllerRetry();
  usePageMetadata(t('adminTitle'), t('adminDescription'), { noindex: true });

  useEffect(() => {
    if (!user || !supabase) return;
    let active = true;
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (active) setAal(data?.currentLevel === 'aal2' ? 'aal2' : 'aal1');
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!loading && !user) return <Navigate replace to="/sign-in?returnTo=%2Fadmin" />;
  if (!aal) return <p role="status">{t('authWorking')}</p>;
  if (aal !== 'aal2')
    return (
      <SecondFactor
        onSuccess={() => {
          setAal('aal2');
          void queryClient.invalidateQueries();
        }}
      />
    );
  if (reports.error instanceof ApiError && reports.error.status === 403)
    return <p role="alert">{t('adminForbidden')}</p>;

  const review = async (
    id: string,
    action: 'DISMISSED' | 'SUSPEND_USER' | 'RESTORE_USER' | 'ARCHIVE_COMMUNITY' | 'CANCEL_EVENT',
  ) => {
    const note = action === 'DISMISSED' ? '' : window.prompt(t('adminDecisionNote'));
    if (note === null) return;
    setBusyId(id);
    setError('');
    try {
      await decide.mutateAsync({ id, data: { action, note: note.slice(0, 2000) } });
      await queryClient.invalidateQueries({ queryKey: getModerationControllerListQueryKey() });
    } catch {
      setError(t('adminActionError'));
    } finally {
      setBusyId('');
    }
  };
  const decideVerification = async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
    setBusyId(requestId);
    setError('');
    try {
      await verify.mutateAsync({ requestId, data: { decision } });
      await queryClient.invalidateQueries({
        queryKey: getOrganizationsControllerListPendingVerificationRequestsQueryKey(),
      });
    } catch {
      setError(t('adminActionError'));
    } finally {
      setBusyId('');
    }
  };
  const reviewPrivacy = async (id: string, action: 'START_REVIEW' | 'APPROVE' | 'REJECT') => {
    const note = action === 'START_REVIEW' ? '' : window.prompt(t('adminDecisionNote'));
    if (note === null) return;
    setBusyId(id);
    setError('');
    try {
      await decidePrivacy.mutateAsync({ id, data: { action, note: note.slice(0, 2000) } });
      await queryClient.invalidateQueries({ queryKey: getPrivacyAdminControllerListQueryKey() });
    } catch {
      setError(t('adminActionError'));
    } finally {
      setBusyId('');
    }
  };
  const retryPrivacyActions = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await retryPrivacy.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getPrivacyAdminControllerListQueryKey() });
    } catch {
      setError(t('adminActionError'));
    } finally {
      setBusyId('');
    }
  };
  const openPrivacy = (privacyRequests.data ?? []).filter(
    (request) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(request.status),
  );
  return (
    <div className="mx-auto grid max-w-(--container-reading) gap-8">
      <header>
        <h1 className="text-3xl font-bold">{t('adminTitle')}</h1>
        <p className="text-text-muted">{t('adminDescription')}</p>
      </header>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">{t('adminReports')}</h2>
        {reports.isPending ? (
          <p role="status">{t('authWorking')}</p>
        ) : reports.isError ? (
          <Button onClick={() => void reports.refetch()}>{t('reloadPage')}</Button>
        ) : reports.data?.filter((report) => report.status === 'OPEN').length ? (
          reports.data
            .filter((report) => report.status === 'OPEN')
            .map((report) => {
              const href =
                report.targetType === 'user'
                  ? `/users/${report.targetId}`
                  : report.targetType === 'post'
                    ? null
                    : report.targetType === 'community'
                      ? `/communities/${report.targetId}`
                      : report.targetType === 'event'
                        ? `/events/${report.targetId}`
                        : null;
              const action =
                report.targetType === 'user'
                  ? 'SUSPEND_USER'
                  : report.targetType === 'community'
                    ? 'ARCHIVE_COMMUNITY'
                    : report.targetType === 'event'
                      ? 'CANCEL_EVENT'
                      : null;
              return (
                <article
                  className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
                  key={report.id}
                >
                  <p className="text-sm text-text-muted">
                    {report.targetType} · {report.targetId}
                  </p>
                  <p className="whitespace-pre-wrap wrap-break-word">{report.reason}</p>
                  <div className="flex flex-wrap gap-2">
                    {href && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={href}>{t('viewNotificationContext')}</Link>
                      </Button>
                    )}
                    <Button
                      disabled={Boolean(busyId)}
                      size="sm"
                      variant="secondary"
                      onClick={() => void review(report.id, 'DISMISSED')}
                    >
                      {t('adminDismiss')}
                    </Button>
                    {action && (
                      <Button
                        disabled={Boolean(busyId)}
                        size="sm"
                        onClick={() => void review(report.id, action)}
                      >
                        {t(`admin_${action}`)}
                      </Button>
                    )}
                    {report.targetType === 'user' && (
                      <Button
                        disabled={Boolean(busyId)}
                        size="sm"
                        variant="secondary"
                        onClick={() => void review(report.id, 'RESTORE_USER')}
                      >
                        {t('admin_RESTORE_USER')}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
        ) : (
          <p className="text-text-muted">{t('adminEmptyReports')}</p>
        )}
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">{t('adminVerification')}</h2>
        {requests.isPending ? (
          <p role="status">{t('authWorking')}</p>
        ) : requests.isError ? (
          <Button onClick={() => void requests.refetch()}>{t('reloadPage')}</Button>
        ) : requests.data?.length ? (
          requests.data.map((request) => (
            <article
              className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
              key={request.id}
            >
              <Link
                className="font-semibold text-primary hover:underline"
                to={`/organizations/${request.organizationSlug}`}
              >
                {request.organizationName}
              </Link>
              {request.requestNote && (
                <p className="whitespace-pre-wrap wrap-break-word text-sm">{request.requestNote}</p>
              )}
              <div className="flex gap-2">
                <Button
                  disabled={Boolean(busyId)}
                  size="sm"
                  onClick={() => void decideVerification(request.id, 'APPROVE')}
                >
                  {t('adminApprove')}
                </Button>
                <Button
                  disabled={Boolean(busyId)}
                  size="sm"
                  variant="secondary"
                  onClick={() => void decideVerification(request.id, 'REJECT')}
                >
                  {t('adminReject')}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-text-muted">{t('adminEmptyVerification')}</p>
        )}
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">{t('adminPrivacy')}</h2>
        {privacyRequests.isPending ? (
          <p role="status">{t('authWorking')}</p>
        ) : privacyRequests.isError ? (
          <Button onClick={() => void privacyRequests.refetch()}>{t('reloadPage')}</Button>
        ) : openPrivacy.length ? (
          openPrivacy.map((request) => (
            <article
              className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
              key={request.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{t(`privacyRequestType_${request.requestType}`)}</p>
                <Badge variant={request.status === 'PENDING_PROVIDER' ? 'warning' : 'info'}>
                  {t(`privacyRequestStatus_${request.status}`)}
                </Badge>
              </div>
              <p className="text-sm text-text-muted">
                {request.requesterEmail}
                {' · '}
                {t('privacyRequestDue', {
                  date: formatTurkeyDateTime(request.dueAt, i18n.language),
                })}
              </p>
              {request.requestNote ? (
                <p className="whitespace-pre-wrap wrap-break-word text-sm">{request.requestNote}</p>
              ) : null}
              {request.providerActions?.length ? (
                <ul className="grid gap-1 text-xs text-text-subtle">
                  {request.providerActions.map((action) => (
                    <li key={action.id}>
                      {action.provider} · {action.action} · {action.status}
                      {action.lastError ? ` · ${action.lastError}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {request.status === 'RECEIVED' ? (
                  <Button
                    disabled={Boolean(busyId)}
                    onClick={() => void reviewPrivacy(request.id, 'START_REVIEW')}
                    size="sm"
                    variant="secondary"
                  >
                    {t('adminStartReview')}
                  </Button>
                ) : null}
                <Button
                  disabled={Boolean(busyId)}
                  onClick={() => void reviewPrivacy(request.id, 'APPROVE')}
                  size="sm"
                >
                  {t('adminApproveRequest')}
                </Button>
                <Button
                  disabled={Boolean(busyId)}
                  onClick={() => void reviewPrivacy(request.id, 'REJECT')}
                  size="sm"
                  variant="secondary"
                >
                  {t('adminRejectRequest')}
                </Button>
                {request.status === 'PENDING_PROVIDER' ? (
                  <Button
                    disabled={Boolean(busyId)}
                    onClick={() => void retryPrivacyActions(request.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t('adminRetryProviders')}
                  </Button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="text-text-muted">{t('adminEmptyPrivacy')}</p>
        )}
      </section>
    </div>
  );
}

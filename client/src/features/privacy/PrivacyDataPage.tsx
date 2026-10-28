import { Download, FileText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { ApiError } from '@/api/fetcher';
import {
  privacyControllerExportData,
  usePrivacyControllerAccept,
  usePrivacyControllerCancelRequest,
  usePrivacyControllerCreateRequest,
  usePrivacyControllerDeclareAge,
  usePrivacyControllerListRequests,
  usePrivacyControllerStatus,
} from '@/api/generated/privacy/privacy';
import type {
  PrivacyRequestDtoRequestType,
  PrivacyRequestDtoStatus,
} from '@/api/generated/wasl-client.schemas';
import { QueryError } from '@/components/feedback/QueryError';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';
import { formatTurkeyDateTime } from '@/features/resources/resource-utils';

const requestTypes: PrivacyRequestDtoRequestType[] = ['ACCESS', 'CORRECTION', 'EXPORT', 'DELETION'];

const openStatuses: PrivacyRequestDtoStatus[] = ['RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER'];

const requestStatusVariant = (
  status: PrivacyRequestDtoStatus,
): 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary' => {
  switch (status) {
    case 'RECEIVED':
      return 'info';
    case 'IN_REVIEW':
      return 'warning';
    case 'PENDING_PROVIDER':
      return 'primary';
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
};

export function PrivacyDataPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const status = usePrivacyControllerStatus({ query: { enabled: Boolean(user) } });
  const requests = usePrivacyControllerListRequests({ query: { enabled: Boolean(user) } });
  const declareAge = usePrivacyControllerDeclareAge();
  const accept = usePrivacyControllerAccept();
  const createRequest = usePrivacyControllerCreateRequest();
  const cancelRequest = usePrivacyControllerCancelRequest();
  const { confirm, dialog } = useConfirm();
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [requestType, setRequestType] = useState<PrivacyRequestDtoRequestType>('ACCESS');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  usePageMetadata(t('privacyTitle'), t('privacyDescription'), { noindex: true });

  if (!loading && !user) return <Navigate replace to="/sign-in?returnTo=%2Fprivacy" />;
  if (status.isPending || requests.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('privacyLoading')}
      </p>
    );
  if (status.isError) {
    return <QueryError message={t('privacyLoadError')} onRetry={() => void status.refetch()} />;
  }
  if (requests.isError) {
    return <QueryError message={t('privacyLoadError')} onRetry={() => void requests.refetch()} />;
  }

  const ageEligibility = status.data.ageEligibility;
  const requestRows = requests.data;
  const pendingDeletion = requestRows.find(
    (request) => request.requestType === 'DELETION' && openStatuses.includes(request.status),
  );

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries();
  };

  const confirmAge = async (): Promise<void> => {
    setError('');
    setNotice('');
    try {
      await declareAge.mutateAsync({ data: { isAdult: true } });
      await refresh();
    } catch {
      setError(t('privacyAgeSaveError'));
    }
  };

  const acceptDocument = async (
    documentType: 'TERMS_OF_USE' | 'PRIVACY_NOTICE',
    version: string,
  ): Promise<void> => {
    setError('');
    setNotice('');
    try {
      await accept.mutateAsync({ data: { documentType, version } });
      await refresh();
    } catch {
      setError(t('privacyDocumentAcceptError'));
    }
  };

  const downloadExport = async (): Promise<void> => {
    setError('');
    setNotice('');
    setExporting(true);
    try {
      const data = await privacyControllerExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wasl-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError(t('privacyExportError'));
    } finally {
      setExporting(false);
    }
  };

  const submitRequest = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (
      requestType === 'DELETION' &&
      !(await confirm({
        title: t('privacyDeletionConfirmTitle'),
        description: t('privacyDeletionConfirm'),
        confirmLabel: t('privacyRequestType_DELETION'),
        destructive: true,
      }))
    )
      return;
    setBusyId('new');
    try {
      const created = await createRequest.mutateAsync({
        data: {
          requestType,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      setNote('');
      setNotice(
        t('privacyRequestSubmitted', {
          date: formatTurkeyDateTime(created.dueAt, i18n.language),
        }),
      );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? t('privacyRequestConflict')
          : t('privacyRequestError'),
      );
    } finally {
      setBusyId('');
    }
  };

  const cancelRequestRow = async (id: string): Promise<void> => {
    if (
      !(await confirm({
        title: t('privacyCancelRequest'),
        description: t('privacyConfirmCancelRequest'),
        confirmLabel: t('privacyCancelRequest'),
        destructive: true,
      }))
    )
      return;
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      await cancelRequest.mutateAsync({ id });
      setNotice(t('privacyRequestCancelled'));
      await refresh();
    } catch {
      setError(t('privacyRequestCancelError'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('privacyTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('privacyDescription')}</p>
      </header>

      {pendingDeletion ? (
        <p
          className="rounded-lg bg-warning-soft px-3 py-2 text-sm font-medium text-warning"
          role="status"
        >
          {t('privacyDeletionPending')}
        </p>
      ) : null}
      {notice ? (
        <p
          className="rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Card>
        <section aria-labelledby="privacy-age-heading" className="grid gap-4 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold" id="privacy-age-heading">
              {t('privacyAgeTitle')}
            </h2>
            <Badge variant={ageEligibility === '18_PLUS' ? 'success' : 'warning'}>
              {t(`privacyAgeStatus_${ageEligibility}`)}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-text-muted">{t('privacyAgeHint')}</p>
          {ageEligibility === 'UNVERIFIED' ? (
            <div className="grid gap-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  aria-label={t('privacyAgeConfirmLabel')}
                  checked={confirmedAdult}
                  className="mt-0.5"
                  id="privacy-age-confirm"
                  onCheckedChange={(value) => setConfirmedAdult(value === true)}
                />
                <Label className="font-normal leading-relaxed" htmlFor="privacy-age-confirm">
                  {t('privacyAgeConfirmLabel')}
                </Label>
              </div>
              <Button
                className="w-fit"
                disabled={!confirmedAdult || declareAge.isPending}
                onClick={() => void confirmAge()}
                type="button"
              >
                {t('privacyAgeConfirmAction')}
              </Button>
            </div>
          ) : null}
          {ageEligibility === 'UNDER_18' ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {t('privacyAgeUnder18')}
            </p>
          ) : null}
          {ageEligibility === '18_PLUS' ? (
            <p className="text-sm text-text-muted">{t('privacyAgeConfirmed')}</p>
          ) : null}
        </section>
      </Card>

      <Card>
        <section aria-labelledby="privacy-agreements-heading" className="grid gap-4 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <FileText aria-hidden="true" className="size-5 text-text-subtle" />
            <h2 className="text-xl font-bold" id="privacy-agreements-heading">
              {t('privacyAgreementsTitle')}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-text-muted">{t('privacyAgreementsHint')}</p>
          {status.data.documents.length ? (
            <ul className="grid gap-4">
              {status.data.documents.map((document) => {
                if (document.type !== 'TERMS_OF_USE' && document.type !== 'PRIVACY_NOTICE')
                  return null;
                const documentType = document.type;
                const accepted = status.data.acceptedDocuments.some(
                  (row) => row.documentType === documentType && row.version === document.version,
                );
                return (
                  <li
                    className="grid gap-3 rounded-(--shape-radius-control) border border-border p-4"
                    key={document.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <p className="font-semibold">{t(`privacyDocumentType_${document.type}`)}</p>
                        <p className="text-xs text-text-subtle">
                          {t('privacyDocumentVersion', {
                            version: document.version,
                            locale: document.locale,
                          })}
                        </p>
                      </div>
                      {accepted ? (
                        <Badge variant="success">{t('privacyDocumentAccepted')}</Badge>
                      ) : (
                        <Button
                          disabled={accept.isPending}
                          onClick={() => void acceptDocument(documentType, document.version)}
                          size="sm"
                          type="button"
                        >
                          {t('privacyDocumentAccept')}
                        </Button>
                      )}
                    </div>
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-primary-soft-text">
                        {t('privacyDocumentRead')}
                      </summary>
                      <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-soft p-3 text-xs leading-relaxed text-text-muted">
                        {document.content}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{t('privacyAgreementsEmpty')}</p>
          )}
        </section>
      </Card>

      <Card>
        <section aria-labelledby="privacy-export-heading" className="grid gap-4 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <Download aria-hidden="true" className="size-5 text-text-subtle" />
            <h2 className="text-xl font-bold" id="privacy-export-heading">
              {t('privacyExportTitle')}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-text-muted">{t('privacyExportHint')}</p>
          <Button
            className="w-fit"
            disabled={exporting}
            onClick={() => void downloadExport()}
            type="button"
            variant="outline"
          >
            <Download aria-hidden="true" />
            {t('privacyExportAction')}
          </Button>
        </section>
      </Card>

      <Card>
        <section aria-labelledby="privacy-requests-heading" className="grid gap-5 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-5 text-text-subtle" />
            <h2 className="text-xl font-bold" id="privacy-requests-heading">
              {t('privacyRequestsTitle')}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-text-muted">{t('privacyRequestsHint')}</p>
          <form className="grid gap-4" onSubmit={(event) => void submitRequest(event)}>
            <Field id="privacy-request-type" label={t('privacyRequestType')}>
              <Select
                id="privacy-request-type"
                onValueChange={(value) => setRequestType(value as PrivacyRequestDtoRequestType)}
                options={requestTypes.map((type) => ({
                  value: type,
                  label: t(`privacyRequestType_${type}`),
                }))}
                value={requestType}
              />
            </Field>
            <Field
              hint={t('privacyRequestNoteHint')}
              id="privacy-request-note"
              label={t('privacyRequestNote')}
            >
              <Textarea
                id="privacy-request-note"
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
            </Field>
            <Button
              className="w-fit"
              disabled={createRequest.isPending || busyId === 'new'}
              type="submit"
            >
              {t('privacyRequestSubmit')}
            </Button>
          </form>

          <div className="grid gap-3">
            <h3 className="text-base font-semibold">{t('privacyRequestHistory')}</h3>
            {requestRows.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-(--shape-radius-card) border border-border">
                {requestRows.map((request) => (
                  <li className="grid gap-2 px-4 py-3.5" key={request.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {t(`privacyRequestType_${request.requestType}`)}
                      </p>
                      <Badge variant={requestStatusVariant(request.status)}>
                        {t(`privacyRequestStatus_${request.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-subtle">
                      {t('privacyRequestSubmittedOn', {
                        date: formatTurkeyDateTime(request.createdAt, i18n.language),
                      })}
                      {' · '}
                      {t('privacyRequestDue', {
                        date: formatTurkeyDateTime(request.dueAt, i18n.language),
                      })}
                    </p>
                    {request.requestNote ? (
                      <p className="whitespace-pre-wrap wrap-break-word text-sm text-text-muted">
                        {request.requestNote}
                      </p>
                    ) : null}
                    {request.decisionNote ? (
                      <p className="whitespace-pre-wrap wrap-break-word text-sm text-text-muted">
                        {t('privacyRequestResponse', { note: request.decisionNote })}
                      </p>
                    ) : null}
                    {['RECEIVED', 'IN_REVIEW'].includes(request.status) ? (
                      <Button
                        className="w-fit"
                        disabled={busyId === request.id}
                        onClick={() => void cancelRequestRow(request.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {t('privacyCancelRequest')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                description={t('privacyRequestsEmpty')}
                icon={ShieldCheck}
                title={t('privacyRequestHistory')}
              />
            )}
          </div>
        </section>
      </Card>
      {dialog}
    </div>
  );
}

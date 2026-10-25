import { useQueryClient } from '@tanstack/react-query';
import { useHead } from '@unhead/react';
import { ArrowLeft, Copy, Mail, Pencil, UserPlus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  getOrganizationsControllerListAdminInvitationsQueryKey,
  getOrganizationsControllerListManagersQueryKey,
  getOrganizationsControllerListVerificationRequestsQueryKey,
  getOrganizationsControllerMineQueryKey,
  getOrganizationsControllerPublicProfileQueryKey,
  useOrganizationsControllerCreateAdminInvitation,
  useOrganizationsControllerListAdminInvitations,
  useOrganizationsControllerListManagers,
  useOrganizationsControllerListVerificationRequests,
  useOrganizationsControllerMine,
  useOrganizationsControllerPublicProfile,
  useOrganizationsControllerRemoveAdmin,
  useOrganizationsControllerRequestVerification,
  useOrganizationsControllerRevokeAdminInvitation,
  useOrganizationsControllerTransferOwnership,
} from '@/api/generated/organizations/organizations';
import { ApiError } from '@/api/fetcher';
import { QueryError } from '@/components/feedback/QueryError';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

const dangerButtonClass =
  'border-danger/30 text-danger hover:bg-danger-soft hover:text-danger';

function ManageSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold" id={id}>
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function OrganizationManagePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { slug = '' } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const lang = languageCode(i18n.language);
  const profile = useOrganizationsControllerPublicProfile(
    slug,
    { lang },
    { query: { enabled: Boolean(slug) } },
  );
  const mine = useOrganizationsControllerMine({ query: { enabled: Boolean(user) } });
  const organization = profile.data;
  const role = mine.data?.find((item) => item.id === organization?.id)?.role;
  const isOwner = role === 'OWNER';
  const managers = useOrganizationsControllerListManagers(organization?.id ?? '', {
    query: { enabled: Boolean(organization && role) },
  });
  const invitations = useOrganizationsControllerListAdminInvitations(organization?.id ?? '', {
    query: { enabled: Boolean(organization && isOwner) },
  });
  const verificationRequests = useOrganizationsControllerListVerificationRequests(
    organization?.id ?? '',
    { query: { enabled: Boolean(organization && role) } },
  );
  const invite = useOrganizationsControllerCreateAdminInvitation();
  const removeAdmin = useOrganizationsControllerRemoveAdmin();
  const revokeInvitation = useOrganizationsControllerRevokeAdminInvitation();
  const transferOwnership = useOrganizationsControllerTransferOwnership();
  const requestVerification = useOrganizationsControllerRequestVerification();
  const [email, setEmail] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [formError, setFormError] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferError, setTransferError] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const { confirm, dialog } = useConfirm();

  useHead({ title: t('manageOrganization') });

  if (!authLoading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (authLoading || profile.isPending || mine.isPending) {
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingOrganization')}
      </p>
    );
  }
  if (profile.isError || !organization) {
    return (
      <QueryError message={t('organizationEditLoadError')} onRetry={() => void profile.refetch()} />
    );
  }
  if (!role)
    return (
      <p className="rounded-(--shape-radius-card) border border-border bg-card p-5 text-sm font-medium text-danger" role="alert">
        {t('organizationManagementForbidden')}
      </p>
    );

  const admins = managers.data?.filter((manager) => manager.role === 'ADMIN') ?? [];
  const latestVerification = verificationRequests.data?.[0];
  const verificationPending = latestVerification?.status === 'PENDING';
  const statusVariant =
    organization.verificationStatus === 'VERIFIED'
      ? 'success'
      : verificationPending
        ? 'warning'
        : organization.verificationStatus === 'REJECTED'
          ? 'danger'
          : 'neutral';

  const inviteAdmin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    setInvitationLink('');
    try {
      const created = await invite.mutateAsync({
        id: organization.id,
        data: { targetEmail: email.trim() },
      });
      const url = `${window.location.origin}/organizations/invitations/accept?token=${encodeURIComponent(created.token)}`;
      setInvitationLink(url);
      setEmail('');
      await queryClient.invalidateQueries({
        queryKey: getOrganizationsControllerListAdminInvitationsQueryKey(organization.id),
      });
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 409
          ? t('organizationInviteConflict')
          : error instanceof ApiError && error.status === 400
            ? t('organizationInviteTargetError')
            : t('organizationInviteError'),
      );
    }
  };

  const copyInvitationLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success(t('invitationLinkCopied'));
    } catch {
      toast.error(t('organizationAdminActionError'));
    }
  };

  const revoke = async (invitationId: string): Promise<void> => {
    if (
      !(await confirm({
        title: t('revokeInvitation'),
        description: t('confirmRevokeInvitation'),
        confirmLabel: t('revokeInvitation'),
        destructive: true,
      }))
    )
      return;
    try {
      await revokeInvitation.mutateAsync({ id: organization.id, invitationId });
      toast.success(t('organizationInvitationRevoked'));
      await queryClient.invalidateQueries({
        queryKey: getOrganizationsControllerListAdminInvitationsQueryKey(organization.id),
      });
    } catch {
      toast.error(t('organizationAdminActionError'));
    }
  };

  const remove = async (userId: string): Promise<void> => {
    if (
      !(await confirm({
        title: t('removeAdmin'),
        description: t('confirmRemoveAdmin'),
        confirmLabel: t('removeAdmin'),
        destructive: true,
      }))
    )
      return;
    try {
      await removeAdmin.mutateAsync({ id: organization.id, userId });
      toast.success(t('organizationAdminRemoved'));
      await queryClient.invalidateQueries({
        queryKey: getOrganizationsControllerListManagersQueryKey(organization.id),
      });
    } catch {
      toast.error(t('organizationAdminActionError'));
    }
  };

  const transfer = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setTransferError('');
    const target = admins.find((admin) => admin.userId === transferTargetId);
    if (!target) {
      setTransferError(t('organizationTransferTargetError'));
      return;
    }
    if (
      !(await confirm({
        title: t('organizationTransferOwnership'),
        description: t('confirmOwnershipTransfer', {
          name: target.displayName ?? t('organizationManagerUnnamed'),
        }),
        confirmLabel: t('organizationTransferOwnership'),
        destructive: true,
      }))
    )
      return;
    try {
      await transferOwnership.mutateAsync({
        id: organization.id,
        data: { targetUserId: target.userId },
      });
      setTransferTargetId('');
      toast.success(t('organizationOwnershipTransferred'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getOrganizationsControllerMineQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getOrganizationsControllerListManagersQueryKey(organization.id),
        }),
      ]);
    } catch (error) {
      setTransferError(
        error instanceof ApiError && error.status === 400
          ? t('organizationTransferTargetError')
          : error instanceof ApiError && error.status === 403
            ? t('organizationTransferForbidden')
            : t('organizationAdminActionError'),
      );
    }
  };

  const submitVerification = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setVerificationError('');
    try {
      await requestVerification.mutateAsync({
        id: organization.id,
        data: { note: verificationNote.trim() || null },
      });
      setVerificationNote('');
      toast.success(t('organizationVerificationRequested'));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getOrganizationsControllerListVerificationRequestsQueryKey(organization.id),
        }),
        queryClient.invalidateQueries({
          queryKey: getOrganizationsControllerPublicProfileQueryKey(slug, { lang }),
        }),
      ]);
    } catch (error) {
      setVerificationError(
        error instanceof ApiError && error.status === 409
          ? t('organizationVerificationConflict')
          : error instanceof ApiError && error.status === 403
            ? t('organizationManagementForbidden')
            : t('organizationAdminActionError'),
      );
    }
  };

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to={`/organizations/${organization.slug}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('backToOrganization')}
      </Link>

      <header className="grid gap-3 sm:flex sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <Badge className="w-fit" variant="primary">
            {t('organizationRole_' + role)}
          </Badge>
          <h1 className="text-3xl font-extrabold">{organization.name}</h1>
          <p className="max-w-(--container-reading) text-sm leading-relaxed text-text-muted">
            {t('organizationManageIntro')}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/organizations/${organization.slug}/edit`}>
            <Pencil aria-hidden="true" />
            {t('editOrganization')}
          </Link>
        </Button>
      </header>

      <ManageSection
        description={t('organizationVerificationHint')}
        id="organization-verification-heading"
        title={t('organizationVerification')}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">{t('organizationVerificationStatusLabel')}:</span>
          <Badge variant={statusVariant}>
            {t(`organizationVerification_${organization.verificationStatus}`)}
          </Badge>
        </div>
        {verificationRequests.isPending ? (
          <p className="text-sm text-text-muted" role="status">
            {t('loadingOrganizationVerification')}
          </p>
        ) : verificationRequests.isError ? (
          <QueryError
            message={t('organizationVerificationLoadError')}
            onRetry={() => void verificationRequests.refetch()}
          />
        ) : (
          <>
            {verificationPending && latestVerification ? (
              <p className="text-sm text-text-muted">
                {t('organizationVerificationPendingSince', {
                  date: new Date(latestVerification.createdAt).toLocaleDateString(i18n.language, {
                    dateStyle: 'medium',
                    timeZone: 'Europe/Istanbul',
                  }),
                })}
              </p>
            ) : null}
            {latestVerification?.status === 'REJECTED' ? (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                {latestVerification.decisionNote
                  ? t('organizationVerificationRejectedNote', {
                      note: latestVerification.decisionNote,
                    })
                  : t('organizationVerificationNoDecisionNote')}
              </p>
            ) : null}
            {organization.verificationStatus === 'VERIFIED' ? (
              <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                {t('organizationVerifiedHint')}
              </p>
            ) : verificationPending ? null : (
              <form className="grid gap-3" onSubmit={(event) => void submitVerification(event)}>
                <Field
                  id="organization-verification-note"
                  label={t('organizationVerificationNote')}
                >
                  <Textarea
                    id="organization-verification-note"
                    maxLength={2000}
                    onChange={(event) => setVerificationNote(event.currentTarget.value)}
                    value={verificationNote}
                  />
                </Field>
                <Button
                  className="justify-self-start"
                  disabled={requestVerification.isPending}
                  type="submit"
                >
                  {requestVerification.isPending
                    ? t('organizationVerificationRequesting')
                    : t('organizationVerificationAction')}
                </Button>
              </form>
            )}
            {verificationError ? (
              <p
                className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
                role="alert"
              >
                {verificationError}
              </p>
            ) : null}
          </>
        )}
      </ManageSection>

      <ManageSection id="organization-managers-heading" title={t('organizationManagers')}>
        {managers.isPending ? (
          <p className="text-sm text-text-muted" role="status">
            {t('loadingOrganizationManagers')}
          </p>
        ) : managers.isError ? (
          <QueryError
            message={t('organizationManagersLoadError')}
            onRetry={() => void managers.refetch()}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {managers.data.map((manager) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                key={manager.userId}
              >
                <div className="grid gap-0.5">
                  <p className="font-medium text-text">
                    {manager.displayName ?? t('organizationManagerUnnamed')}
                  </p>
                  <p className="text-xs text-text-subtle">
                    {t(`organizationRole_${manager.role}`)}
                  </p>
                </div>
                {isOwner && manager.role === 'ADMIN' ? (
                  <Button
                    className={dangerButtonClass}
                    disabled={removeAdmin.isPending}
                    onClick={() => void remove(manager.userId)}
                    size="sm"
                    variant="outline"
                  >
                    <X aria-hidden="true" />
                    {t('removeAdmin')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </ManageSection>

      {isOwner ? (
        <>
          <ManageSection
            description={t('organizationTransferHint')}
            id="organization-transfer-heading"
            title={t('organizationTransferOwnership')}
          >
            {admins.length ? (
              <form
                className="grid gap-3 sm:flex sm:items-end"
                onSubmit={(event) => void transfer(event)}
              >
                <Field
                  className="flex-1"
                  id="organization-transfer-target"
                  label={t('organizationTransferTarget')}
                >
                  <Select
                    id="organization-transfer-target"
                    onValueChange={setTransferTargetId}
                    options={admins.map((admin) => ({
                      value: admin.userId,
                      label: admin.displayName ?? t('organizationManagerUnnamed'),
                    }))}
                    placeholder={t('organizationTransferChooseAdmin')}
                    value={transferTargetId}
                  />
                </Field>
                <Button
                  className={dangerButtonClass}
                  disabled={transferOwnership.isPending || !transferTargetId}
                  type="submit"
                  variant="outline"
                >
                  {transferOwnership.isPending
                    ? t('organizationTransferring')
                    : t('organizationTransferAction')}
                </Button>
              </form>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-text-muted">
                {t('organizationTransferNeedsAdmin')}
              </p>
            )}
            {transferError ? (
              <p
                className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
                role="alert"
              >
                {transferError}
              </p>
            ) : null}
          </ManageSection>

          <ManageSection
            description={t('organizationInviteHint')}
            id="organization-invite-heading"
            title={t('organizationInviteAdmin')}
          >
            <form
              className="grid gap-3 sm:flex sm:items-end"
              onSubmit={(event) => void inviteAdmin(event)}
            >
              <Field
                className="flex-1"
                id="organization-invite-email"
                label={t('organizationInviteEmail')}
              >
                <Input
                  id="organization-invite-email"
                  maxLength={320}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Button disabled={invite.isPending || !email.trim()} type="submit">
                <UserPlus aria-hidden="true" />
                {invite.isPending ? t('organizationInviteSending') : t('organizationInviteAction')}
              </Button>
            </form>
            {formError ? (
              <p
                className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {invitationLink ? (
              <div className="grid gap-2 rounded-lg bg-surface-soft p-4">
                <p className="text-sm font-semibold text-text">{t('organizationInviteCreated')}</p>
                <p className="break-all text-sm text-text-muted">{invitationLink}</p>
                <Button
                  className="justify-self-start"
                  onClick={() => void copyInvitationLink()}
                  size="sm"
                  variant="outline"
                >
                  <Copy aria-hidden="true" />
                  {t('copyInvitationLink')}
                </Button>
              </div>
            ) : null}
          </ManageSection>

          <ManageSection
            id="organization-invitations-heading"
            title={t('organizationPendingInvitations')}
          >
            {invitations.isPending ? (
              <p className="text-sm text-text-muted" role="status">
                {t('loadingOrganizationInvitations')}
              </p>
            ) : invitations.isError ? (
              <QueryError
                message={t('organizationInvitationsLoadError')}
                onRetry={() => void invitations.refetch()}
              />
            ) : invitations.data.length ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {invitations.data.map((invitation) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    key={invitation.id}
                  >
                    <div className="grid gap-0.5">
                      <p className="flex items-center gap-2 font-medium text-text">
                        <Mail aria-hidden="true" className="size-4 text-text-subtle" />
                        {invitation.targetDisplayName ?? t('organizationManagerUnnamed')}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {t('organizationInvitationExpires', {
                          date: new Date(invitation.expiresAt).toLocaleDateString(i18n.language, {
                            dateStyle: 'medium',
                            timeZone: 'Europe/Istanbul',
                          }),
                        })}
                      </p>
                    </div>
                    <Button
                      className={dangerButtonClass}
                      disabled={revokeInvitation.isPending}
                      onClick={() => void revoke(invitation.id)}
                      size="sm"
                      variant="outline"
                    >
                      <X aria-hidden="true" />
                      {t('revokeInvitation')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-text-muted">
                {t('organizationNoPendingInvitations')}
              </p>
            )}
          </ManageSection>
        </>
      ) : (
        <p className="rounded-(--shape-radius-card) border border-border bg-card p-5 text-sm text-text-muted">
          {t('organizationAdminsOwnerOnly')}
        </p>
      )}
      {dialog}
    </section>
  );
}

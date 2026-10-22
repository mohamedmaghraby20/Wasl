import { useQueryClient } from '@tanstack/react-query';
import { useHead } from '@unhead/react';
import { ArrowLeft, Copy, Mail, Pencil, UserPlus, X } from 'lucide-react';
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
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

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

  useHead({ title: t('manageOrganization') });

  if (!authLoading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (authLoading || profile.isPending || mine.isPending) {
    return <p role="status">{t('loadingOrganization')}</p>;
  }
  if (profile.isError || !organization) {
    return (
      <QueryError message={t('organizationEditLoadError')} onRetry={() => void profile.refetch()} />
    );
  }
  if (!role) return <p role="alert">{t('organizationManagementForbidden')}</p>;

  const admins = managers.data?.filter((manager) => manager.role === 'ADMIN') ?? [];
  const latestVerification = verificationRequests.data?.[0];
  const verificationPending = latestVerification?.status === 'PENDING';

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
    if (!window.confirm(t('confirmRevokeInvitation'))) return;
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
    if (!window.confirm(t('confirmRemoveAdmin'))) return;
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
      !window.confirm(
        t('confirmOwnershipTransfer', {
          name: target.displayName ?? t('organizationManagerUnnamed'),
        }),
      )
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

  const inputClass =
    'min-h-(--control-height-lg) w-full rounded-(--shape-radius-control) border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring';

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-8">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to={`/organizations/${organization.slug}`}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t('backToOrganization')}
      </Link>
      <header className="border-b border-border pb-5">
        <p className="text-sm text-muted-foreground">{t('organizationRole_' + role)}</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{organization.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('organizationManageIntro')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to={`/organizations/${organization.slug}/edit`}>
              <Pencil aria-hidden="true" size={16} />
              {t('editOrganization')}
            </Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="organization-verification-heading" className="grid gap-4">
        <h2 className="font-heading text-xl font-bold" id="organization-verification-heading">
          {t('organizationVerification')}
        </h2>
        <p className="text-sm">
          {t('organizationVerificationStatusLabel')}:{' '}
          <span className="font-semibold">
            {t(`organizationVerification_${organization.verificationStatus}`)}
          </span>
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('organizationVerificationHint')}
        </p>
        {verificationRequests.isPending ? (
          <p role="status">{t('loadingOrganizationVerification')}</p>
        ) : verificationRequests.isError ? (
          <QueryError
            message={t('organizationVerificationLoadError')}
            onRetry={() => void verificationRequests.refetch()}
          />
        ) : (
          <>
            {verificationPending && latestVerification && (
              <p className="text-sm text-muted-foreground">
                {t('organizationVerificationPendingSince', {
                  date: new Date(latestVerification.createdAt).toLocaleDateString(i18n.language, {
                    dateStyle: 'medium',
                  }),
                })}
              </p>
            )}
            {latestVerification?.status === 'REJECTED' && (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                {latestVerification.decisionNote
                  ? t('organizationVerificationRejectedNote', {
                      note: latestVerification.decisionNote,
                    })
                  : t('organizationVerificationNoDecisionNote')}
              </p>
            )}
            {organization.verificationStatus === 'VERIFIED' ? (
              <p className="rounded-md border border-border bg-card p-3 text-sm">
                {t('organizationVerifiedHint')}
              </p>
            ) : verificationPending ? null : (
              <form className="grid gap-3" onSubmit={(event) => void submitVerification(event)}>
                <label className="grid gap-2 text-sm font-semibold">
                  <span>{t('organizationVerificationNote')}</span>
                  <textarea
                    className={`${inputClass} min-h-28`}
                    maxLength={2000}
                    onChange={(event) => setVerificationNote(event.currentTarget.value)}
                    value={verificationNote}
                  />
                </label>
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
            {verificationError && (
              <p
                className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {verificationError}
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="organization-managers-heading" className="grid gap-4">
        <h2 className="font-heading text-xl font-bold" id="organization-managers-heading">
          {t('organizationManagers')}
        </h2>
        {managers.isPending ? (
          <p role="status">{t('loadingOrganizationManagers')}</p>
        ) : managers.isError ? (
          <QueryError
            message={t('organizationManagersLoadError')}
            onRetry={() => void managers.refetch()}
          />
        ) : (
          <ul className="grid gap-3">
            {managers.data.map((manager) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
                key={manager.userId}
              >
                <div className="grid gap-1">
                  <p className="font-semibold">
                    {manager.displayName ?? t('organizationManagerUnnamed')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`organizationRole_${manager.role}`)}
                  </p>
                </div>
                {isOwner && manager.role === 'ADMIN' && (
                  <Button
                    className="text-destructive"
                    disabled={removeAdmin.isPending}
                    onClick={() => void remove(manager.userId)}
                    variant="outline"
                  >
                    <X aria-hidden="true" size={16} />
                    {t('removeAdmin')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <>
          <section
            aria-labelledby="organization-transfer-heading"
            className="grid gap-4 border-t border-border pt-7"
          >
            <h2 className="font-heading text-xl font-bold" id="organization-transfer-heading">
              {t('organizationTransferOwnership')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('organizationTransferHint')}
            </p>
            {admins.length ? (
              <form
                className="grid gap-3 sm:flex sm:items-end"
                onSubmit={(event) => void transfer(event)}
              >
                <label className="grid flex-1 gap-2 text-sm font-semibold">
                  <span>{t('organizationTransferTarget')}</span>
                  <select
                    className={inputClass}
                    onChange={(event) => setTransferTargetId(event.currentTarget.value)}
                    required
                    value={transferTargetId}
                  >
                    <option value="">{t('organizationTransferChooseAdmin')}</option>
                    {admins.map((admin) => (
                      <option key={admin.userId} value={admin.userId}>
                        {admin.displayName ?? t('organizationManagerUnnamed')}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  className="text-destructive"
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
              <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">
                {t('organizationTransferNeedsAdmin')}
              </p>
            )}
            {transferError && (
              <p
                className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {transferError}
              </p>
            )}
          </section>

          <section
            aria-labelledby="organization-invite-heading"
            className="grid gap-4 border-t border-border pt-7"
          >
            <h2 className="font-heading text-xl font-bold" id="organization-invite-heading">
              {t('organizationInviteAdmin')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('organizationInviteHint')}</p>
            <form
              className="grid gap-3 sm:flex sm:items-end"
              onSubmit={(event) => void inviteAdmin(event)}
            >
              <label className="grid flex-1 gap-2 text-sm font-semibold">
                <span>{t('organizationInviteEmail')}</span>
                <input
                  className={inputClass}
                  maxLength={320}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <Button disabled={invite.isPending || !email.trim()} type="submit">
                <UserPlus aria-hidden="true" size={16} />
                {invite.isPending ? t('organizationInviteSending') : t('organizationInviteAction')}
              </Button>
            </form>
            {formError && (
              <p
                className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </p>
            )}
            {invitationLink && (
              <div className="grid gap-2 rounded-(--shape-radius-card) border border-border bg-card p-4">
                <p className="text-sm font-semibold">{t('organizationInviteCreated')}</p>
                <p className="break-all text-sm text-muted-foreground">{invitationLink}</p>
                <Button
                  className="justify-self-start"
                  onClick={() => void copyInvitationLink()}
                  variant="outline"
                >
                  <Copy aria-hidden="true" size={16} />
                  {t('copyInvitationLink')}
                </Button>
              </div>
            )}
          </section>

          <section
            aria-labelledby="organization-invitations-heading"
            className="grid gap-4 border-t border-border pt-7"
          >
            <h2 className="font-heading text-xl font-bold" id="organization-invitations-heading">
              {t('organizationPendingInvitations')}
            </h2>
            {invitations.isPending ? (
              <p role="status">{t('loadingOrganizationInvitations')}</p>
            ) : invitations.isError ? (
              <QueryError
                message={t('organizationInvitationsLoadError')}
                onRetry={() => void invitations.refetch()}
              />
            ) : invitations.data.length ? (
              <ul className="grid gap-3">
                {invitations.data.map((invitation) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
                    key={invitation.id}
                  >
                    <div className="grid gap-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <Mail aria-hidden="true" size={16} />
                        {invitation.targetDisplayName ?? t('organizationManagerUnnamed')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('organizationInvitationExpires', {
                          date: new Date(invitation.expiresAt).toLocaleDateString(i18n.language, {
                            dateStyle: 'medium',
                          }),
                        })}
                      </p>
                    </div>
                    <Button
                      className="text-destructive"
                      disabled={revokeInvitation.isPending}
                      onClick={() => void revoke(invitation.id)}
                      variant="outline"
                    >
                      <X aria-hidden="true" size={16} />
                      {t('revokeInvitation')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-muted-foreground">
                {t('organizationNoPendingInvitations')}
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="border-t border-border pt-7 text-sm text-muted-foreground">
          {t('organizationAdminsOwnerOnly')}
        </p>
      )}
    </section>
  );
}

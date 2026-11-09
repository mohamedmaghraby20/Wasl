import { createBrowserRouter } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RootLayout } from './RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/** Initial status while the first lazy route loads. */
function InitialRouteFallback(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <p className="p-6 text-sm text-text-muted" role="status">
      {t('authWorking')}
    </p>
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    HydrateFallback: InitialRouteFallback,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import('@/features/home/HomePage');
          return { Component: HomePage };
        },
      },
      {
        path: 'sign-in',
        lazy: async () => {
          const { AuthPage } = await import('@/features/auth/AuthPage');
          return { Component: AuthPage };
        },
      },
      {
        path: 'sign-up',
        lazy: async () => {
          const { AuthPage } = await import('@/features/auth/AuthPage');
          return { Component: AuthPage };
        },
      },
      {
        path: 'password-reset',
        lazy: async () => {
          const { PasswordResetPage } = await import('@/features/auth/PasswordResetPage');
          return { Component: PasswordResetPage };
        },
      },
      ...['discover', 'communities', 'events'].map((path) => ({
        path,
        lazy: async () => {
          const { DiscoveryPage } = await import('@/features/discovery/DiscoveryPage');
          return { Component: DiscoveryPage };
        },
      })),
      {
        path: 'communities/:id',
        lazy: async () => {
          const { ResourceDetailsPage } = await import('@/features/discovery/ResourceDetailsPage');
          return { Component: () => <ResourceDetailsPage kind="communities" /> };
        },
      },
      {
        path: 'communities/:id/members',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { CommunityMembersPage } = await import(
            '@/features/participation/CommunityMembersPage'
          );
          return { Component: CommunityMembersPage };
        },
      },
      {
        path: 'communities/:id/topics/:topicId',
        lazy: async () => {
          const { CommunityTopicPage } = await import('@/features/discussions/CommunityTopicPage');
          return { Component: CommunityTopicPage };
        },
      },
      ...(['communities', 'events'] as const).map((kind) => ({
        path: `${kind}/:id/participants`,
        handle: { requiresAuth: true },
        lazy: async () => {
          const { ParticipationReviewPage } = await import(
            '@/features/participation/ParticipationReviewPage'
          );
          return { Component: () => <ParticipationReviewPage kind={kind} /> };
        },
      })),
      {
        path: 'events/:id/attendees',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { CommunityMembersPage } = await import(
            '@/features/participation/CommunityMembersPage'
          );
          return { Component: () => <CommunityMembersPage kind="events" /> };
        },
      },
      {
        path: 'events/:id',
        lazy: async () => {
          const { ResourceDetailsPage } = await import('@/features/discovery/ResourceDetailsPage');
          return { Component: () => <ResourceDetailsPage kind="events" /> };
        },
      },
      {
        path: 'profile',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { ProfilePage } = await import('@/features/profile/ProfilePage');
          return { Component: ProfilePage };
        },
      },
      {
        path: 'activity',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { MyActivityPage } = await import('@/features/participation/MyActivityPage');
          return { Component: MyActivityPage };
        },
      },
      {
        path: 'privacy',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { PrivacyDataPage } = await import('@/features/privacy/PrivacyDataPage');
          return { Component: PrivacyDataPage };
        },
      },
      {
        path: 'messages',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { MessagesPage } = await import('@/features/messaging/MessagesPage');
          return { Component: MessagesPage };
        },
      },
      {
        path: 'notifications',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { NotificationsPage } = await import('@/features/notifications/NotificationsPage');
          return { Component: NotificationsPage };
        },
      },
      {
        path: 'admin',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { PlatformModerationPage } = await import(
            '@/features/moderation/PlatformModerationPage'
          );
          return { Component: PlatformModerationPage };
        },
      },
      {
        path: 'profile/edit',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { ProfileEditPage } = await import('@/features/profile/ProfileEditPage');
          return { Component: ProfileEditPage };
        },
      },
      {
        path: 'users/:id',
        lazy: async () => {
          const { PublicUserProfilePage } = await import(
            '@/features/profile/PublicUserProfilePage'
          );
          return { Component: PublicUserProfilePage };
        },
      },
      {
        path: 'organizations/invitations/accept',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { OrganizationInvitationAcceptPage } = await import(
            '@/features/organizations/OrganizationInvitationAcceptPage'
          );
          return { Component: OrganizationInvitationAcceptPage };
        },
      },
      {
        path: 'organizations/:slug',
        lazy: async () => {
          const { OrganizationProfilePage } = await import(
            '@/features/organizations/OrganizationProfilePage'
          );
          return { Component: OrganizationProfilePage };
        },
      },
      {
        path: 'organizations/:slug/manage',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { OrganizationManagePage } = await import(
            '@/features/organizations/OrganizationManagePage'
          );
          return { Component: OrganizationManagePage };
        },
      },
      {
        path: 'organizations/:slug/edit',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { OrganizationEditPage } = await import(
            '@/features/organizations/OrganizationEditPage'
          );
          return { Component: OrganizationEditPage };
        },
      },
      {
        path: 'create',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { CreationStartPage } = await import('@/features/creation/CreationStartPage');
          return { Component: CreationStartPage };
        },
      },
      {
        path: 'create/community',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { CommunityFormPage } = await import('@/features/creation/CommunityFormPage');
          return { Component: CommunityFormPage };
        },
      },
      {
        path: 'create/event',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { EventFormPage } = await import('@/features/creation/EventFormPage');
          return { Component: EventFormPage };
        },
      },
      {
        path: 'create/organization',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { OrganizationCreatePage } = await import(
            '@/features/organizations/OrganizationCreatePage'
          );
          return { Component: OrganizationCreatePage };
        },
      },
      {
        path: 'communities/:id/edit',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { CommunityFormPage } = await import('@/features/creation/CommunityFormPage');
          return { Component: CommunityFormPage };
        },
      },
      {
        path: 'events/:id/edit',
        handle: { requiresAuth: true },
        lazy: async () => {
          const { EventFormPage } = await import('@/features/creation/EventFormPage');
          return { Component: EventFormPage };
        },
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundPage } = await import('@/features/not-found/NotFoundPage');
          return { Component: NotFoundPage };
        },
      },
    ],
  },
]);

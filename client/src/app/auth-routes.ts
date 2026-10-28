import { matchPath } from 'react-router';

export const authenticatedRoutePaths = [
  '/profile', '/activity', '/privacy', '/messages', '/notifications', '/admin',
  '/profile/edit', '/organizations/invitations/accept', '/organizations/:slug/manage',
  '/organizations/:slug/edit', '/create', '/create/community', '/create/event',
  '/create/organization', '/communities/:id/edit', '/events/:id/edit',
] as const;

export function requiresAuthentication(pathname: string): boolean {
  return authenticatedRoutePaths.some((path) => matchPath({ path, end: true }, pathname) !== null);
}

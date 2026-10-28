import { describe, expect, it } from 'vitest';
import { authenticatedRoutePaths, requiresAuthentication } from './auth-routes';

describe('requiresAuthentication', () => {
  it.each(authenticatedRoutePaths)('protects %s', (path) => {
    const concretePath = path.replace(':slug', 'sample-org').replace(':id', 'sample-id');
    expect(requiresAuthentication(concretePath)).toBe(true);
  });

  it.each(['/discover', '/communities/sample-id', '/events/sample-id', '/users/sample-id', '/sign-in'])(
    'leaves public route %s public',
    (path) => expect(requiresAuthentication(path)).toBe(false),
  );
});

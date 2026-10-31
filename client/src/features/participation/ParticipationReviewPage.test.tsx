import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { ParticipationReviewPage } from './ParticipationReviewPage';

const panel = vi.hoisted(() => vi.fn());
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCommunity: () => ({
    data: { id: 'community-1', name: 'Language Circle' },
    isPending: false,
    isError: false,
  }),
  useDiscoveryControllerEvent: () => ({
    data: { id: 'event-1', title: 'Language Meetup', startsAt: '2099-01-01T12:00:00Z' },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/features/discovery/usePageMetadata', () => ({ usePageMetadata: vi.fn() }));
vi.mock('./OrganizerParticipationPanel', () => ({
  OrganizerParticipationPanel: (props: unknown) => {
    panel(props);
    return <p>Review directory</p>;
  },
}));

describe('ParticipationReviewPage', () => {
  beforeEach(async () => {
    panel.mockClear();
    await i18n.changeLanguage('en');
  });
  it.each(['communities', 'events'] as const)('uses the shared review directory for %s', (kind) => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[`/${kind}/resource-slug/participants?status=WAITLISTED`]}>
          <Routes>
            <Route
              path={`/${kind}/:id/participants`}
              element={<ParticipationReviewPage kind={kind} />}
            />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(
      screen.getByRole('heading', {
        name: kind === 'communities' ? 'Membership requests' : 'Manage event registrations',
      }),
    ).toBeVisible();
    expect(panel).toHaveBeenCalledWith(
      expect.objectContaining({
        kind,
        resourceId: kind === 'communities' ? 'community-1' : 'event-1',
        mode: 'directory',
      }),
    );
    expect(
      screen.getByRole('link', {
        name: kind === 'communities' ? 'Back to community' : 'Back to event',
      }),
    ).toHaveAttribute('href', `/${kind}/resource-slug`);
  });
});

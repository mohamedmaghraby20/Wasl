import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { ParticipationQueueLinks } from './ParticipationQueueLinks';

const mocks = vi.hoisted(() => ({ counts: vi.fn() }));
vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerCommunityCounts: mocks.counts,
  useParticipationControllerEventCounts: mocks.counts,
}));

describe('ParticipationQueueLinks', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    mocks.counts.mockReturnValue({ data: { PENDING: 4, WAITLISTED: 2 }, isError: false });
  });
  function renderLinks(kind: 'communities' | 'events' = 'communities'): void {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ParticipationQueueLinks kind={kind} resourceId="resource-1" />
        </MemoryRouter>
      </I18nextProvider>,
    );
  }
  it('deep-links the community counts to their review filters', () => {
    renderLinks();
    expect(screen.getByRole('link', { name: '4 pending' })).toHaveAttribute(
      'href',
      '/communities/resource-1/participants?status=PENDING',
    );
    expect(screen.getByRole('link', { name: '2 waitlisted' })).toHaveAttribute(
      'href',
      '/communities/resource-1/participants?status=WAITLISTED',
    );
  });
  it('hides the counts when no one is waiting', () => {
    mocks.counts.mockReturnValue({ data: { PENDING: 0, WAITLISTED: 0 }, isError: false });
    renderLinks();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('supports event review links without a separate implementation', () => {
    renderLinks('events');
    expect(screen.getByRole('link', { name: '4 pending' })).toHaveAttribute(
      'href',
      '/events/resource-1/participants?status=PENDING',
    );
  });
});

import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { EventAttendeePreview } from './EventAttendeePreview';

vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerEventAttendeePreview: () => ({
    data: {
      total: 5,
      host: { userId: 'host', displayName: 'Host Name', avatarUrl: null },
      members: Array.from({ length: 4 }, (_, index) => ({
        userId: `user-${index}`,
        displayName: `Attendee ${index}`,
        avatarUrl: null,
      })),
    },
    isPending: false,
    isError: false,
  }),
}));

describe('EventAttendeePreview', () => {
  it('shows the host first and links the remaining attendees to the event directory', async () => {
    await i18n.changeLanguage('en');
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <EventAttendeePreview eventId="event-1" />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(within(screen.getAllByRole('listitem')[0]!).getByText('Host')).toBeVisible();
    expect(screen.getByText('+2 more')).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/events/event-1/attendees',
    );
    expect(screen.getByRole('link', { name: /Attendee 0/ })).toHaveAttribute(
      'href',
      '/users/user-0',
    );
  });
});

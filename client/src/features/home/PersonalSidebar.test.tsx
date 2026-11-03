import { render, screen, within, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { PersonalSidebar } from './PersonalSidebar';

const activity = vi.hoisted(() => vi.fn());
vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerMyActivity: activity,
}));
const renderSidebar = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <PersonalSidebar />
      </MemoryRouter>
    </I18nextProvider>,
  );
beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
});

it('filters and orders upcoming accepted events and active communities, caps previews and links to details', () => {
  const events = Array.from({ length: 4 }, (_, index) => ({
    id: `e${index}`,
    slug: `event-${index}`,
    title: `Event ${index}`,
    status: 'ACCEPTED',
    cancelled: false,
    startsAt: `2099-01-0${4 - index}T12:00:00Z`,
  }));
  const communities = Array.from({ length: 6 }, (_, index) => ({
    id: `c${index}`,
    slug: `community-${index}`,
    name: `Community ${index}`,
    status: 'ACTIVE',
    requestedAt: `2026-01-0${index + 1}T12:00:00Z`,
  }));
  activity.mockReturnValue({
    data: {
      events: [
        ...events,
        { ...events[0], id: 'pending', title: 'Pending', status: 'PENDING' },
        { ...events[0], id: 'waitlisted', title: 'Waitlisted', status: 'WAITLISTED' },
        { ...events[0], id: 'cancelled', title: 'Cancelled', cancelled: true },
        { ...events[0], id: 'past', title: 'Past', startsAt: '2000-01-01T12:00:00Z' },
      ],
      communities: [
        ...communities,
        { ...communities[0], id: 'left', name: 'Left community', status: 'LEFT' },
      ],
    },
    isPending: false,
    isError: false,
  });
  renderSidebar();
  const going = within(screen.getByRole('region', { name: 'Going' }));
  expect(going.getAllByRole('listitem').map((item) => item.textContent?.slice(0, 7))).toEqual([
    'Event 3',
    'Event 2',
    'Event 1',
  ]);
  expect(going.getByRole('link', { name: /Event 3/ })).toHaveAttribute('href', '/events/event-3');
  const groups = within(screen.getByRole('region', { name: 'Your communities 6' }));
  expect(groups.getAllByRole('listitem')).toHaveLength(5);
  expect(groups.getAllByRole('listitem')[0]).toHaveTextContent('Community 5');
  expect(groups.getByRole('link', { name: 'Community 5' })).toHaveAttribute(
    'href',
    '/communities/community-5',
  );
  expect(screen.queryByText('Left community')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See all your events' })).toHaveAttribute(
    'href',
    '/activity?view=events',
  );
  expect(screen.getByRole('link', { name: 'See all your communities' })).toHaveAttribute(
    'href',
    '/activity?view=communities',
  );
  const image = screen.getAllByRole('presentation')[0];
  if (image) fireEvent.error(image);
});

it('offers discovery destinations when both lists are empty', () => {
  activity.mockReturnValue({
    data: { events: [], communities: [] },
    isPending: false,
    isError: false,
  });
  renderSidebar();
  expect(screen.getByText('Looks like you’re free')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Find events' })).toHaveAttribute(
    'href',
    '/events?upcoming=true&nonCancelled=true',
  );
  expect(screen.getByRole('link', { name: 'Explore communities' })).toHaveAttribute(
    'href',
    '/communities',
  );
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});

it('distinguishes loading and failure from empty participation and retries', () => {
  activity.mockReturnValue({ isPending: true });
  const view = renderSidebar();
  expect(screen.queryByText('Looks like you’re free')).not.toBeInTheDocument();
  view.unmount();
  const refetch = vi.fn();
  activity.mockReturnValue({ isPending: false, isError: true, refetch });
  renderSidebar();
  expect(screen.getByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button'));
  expect(refetch).toHaveBeenCalledOnce();
  expect(screen.queryByText('Looks like you’re free')).not.toBeInTheDocument();
});

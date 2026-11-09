import { axe } from 'jest-axe';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { i18n } from '@/lib/i18n';
import { EventDetailsLayout } from './EventDetailsLayout';

const event: EventPublicDto = {
  id: 'event-1',
  slug: 'language-meetup',
  title: 'Language meetup',
  description: 'Practice Arabic over coffee.',
  visibility: 'public',
  hostName: 'Samira',
  hostType: 'user',
  hostId: 'host',
  online: false,
  locationName: 'Kadıköy',
  startsAt: '2026-11-15T15:00:00.000Z',
  endsAt: null,
  cancelled: false,
  acceptedRegistrationCount: 3,
  capacity: 20,
  admissionMode: 'instant',
  cityId: 'istanbul',
  cityName: 'Istanbul',
  categories: [],
};

function renderLayout(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <main>
          <EventDetailsLayout
            item={event}
            admissionLabel="admissionInstant"
            headerActions={<button>Share</button>}
            registration={<button>Register for event</button>}
          >
            <p>Event description</p>
          </EventDetailsLayout>
        </main>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('EventDetailsLayout', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('groups the event facts and registration before the description', () => {
    renderLayout();
    const aside = screen.getByRole('complementary', { name: 'Event details and registration' });
    expect(within(aside).getByText('Kadıköy, Istanbul')).toBeVisible();
    expect(within(aside).getByText('Instant registration')).toBeVisible();
    expect(within(aside).getByText('20 people')).toBeVisible();
    expect(within(aside).getByRole('button', { name: 'Register for event' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Language meetup' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to Events' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Share' })).toBeVisible();
    expect(screen.getByText('Event description')).toBeVisible();
    expect(
      aside.compareDocumentPosition(screen.getByText('Event description')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders without axe violations', async () => {
    renderLayout();
    expect((await axe(document.body)).violations).toHaveLength(0);
  });
});

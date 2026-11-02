import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { i18n } from '@/lib/i18n';
import { ResourceCard } from './ResourceCard';

const community: CommunityPublicDto = {
  id: 'reading',
  slug: 'reading-together',
  name: 'Reading together',
  description: 'A reading group.',
  admissionMode: 'open',
  hostName: 'Readers',
  ownerType: 'user',
  ownerId: 'host',
  cityId: 'ankara',
  cityName: 'Ankara',
  categories: [{ id: 'culture', nameEn: 'Culture', nameAr: 'ثقافة', nameTr: 'Kültür' }],
};
const event: EventPublicDto = {
  id: 'walk',
  slug: 'weekend-walk',
  title: 'Weekend walk',
  description: 'Walk with neighbors.',
  visibility: 'public',
  hostName: 'Neighbors',
  hostType: 'user',
  hostId: 'host',
  online: false,
  locationName: 'Park',
  startsAt: '2099-06-20T12:00:00.000Z',
  cancelled: false,
  capacity: 3,
  acceptedRegistrationCount: 1,
  admissionMode: 'automatic',
  cityName: 'Ankara',
  categories: community.categories,
};

function show(item: CommunityPublicDto | EventPublicDto, kind: 'communities' | 'events') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ResourceCard item={item} kind={kind} />} />
          <Route path={`/${kind}/${item.slug}`} element={<h1>Resource details</h1>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('image-led resource cards', () => {
  it('uses a stable cover for a resource regardless of its title', () => {
    const first = show(event, 'events');
    const source = screen.getByAltText('').getAttribute('src');
    first.unmount();
    show({ ...event, title: 'Renamed walk' }, 'events');
    expect(screen.getByAltText('')).toHaveAttribute('src', source);
  });
  it('translates online, approval and full availability into Arabic', async () => {
    await i18n.changeLanguage('ar');
    show(
      { ...event, online: true, acceptedRegistrationCount: 3, admissionMode: 'approval' },
      'events',
    );
    expect(screen.getByText('مكتملة · قائمة الانتظار متاحة')).toBeVisible();
    expect(screen.getByText('تتطلب الموافقة')).toBeVisible();
    expect(screen.getByText(i18n.t('online'))).toBeVisible();
    expect(screen.getByText('3 مسجلين')).toBeVisible();
  });
  it('does not advertise a waitlist or admission for cancelled events', () => {
    show(
      { ...event, cancelled: true, acceptedRegistrationCount: 3, admissionMode: 'approval' },
      'events',
    );
    expect(screen.getByText('Cancelled')).toBeVisible();
    expect(screen.queryByText(/Waitlist|Approval required/)).not.toBeInTheDocument();
  });
  it('labels unlimited capacity without inventing a finite remainder', () => {
    show({ ...event, capacity: null }, 'events');
    expect(screen.getByText('No capacity limit')).toBeVisible();
    expect(screen.queryByText(/places? left/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Waitlist/)).not.toBeInTheDocument();
  });
  it.each([3, null])(
    'distinguishes approval requests from admission with capacity %s',
    (capacity) => {
      show({ ...event, capacity, admissionMode: 'approval' }, 'events');
      expect(screen.getByText('Approval required')).toBeVisible();
    },
  );
  it.each([3, 5])(
    'shows a waitlist instead of negative places when %i registrations fill capacity',
    (acceptedRegistrationCount) => {
      show({ ...event, acceptedRegistrationCount }, 'events');
      expect(screen.getByText('Full · Waitlist available')).toBeVisible();
      expect(screen.queryByText(/places? left/)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: event.title })).toHaveAttribute(
        'href',
        '/events/weekend-walk',
      );
    },
  );
  it('shows accepted registrations and remaining seats without counting the host preview', () => {
    show(event, 'events');
    expect(screen.getByText('1 registered')).toBeVisible();
    expect(screen.getByText('2 places left')).toBeVisible();
    expect(screen.getByText('03:00 PM')).toBeVisible();
  });
  it.each([
    ['communities', community, community.name],
    ['events', event, event.title],
  ] as const)(
    'keeps %s metadata and navigation usable when its decorative cover fails',
    async (kind, item, title) => {
      show(item, kind);
      const cover = screen.getByAltText('');
      expect(cover).toHaveAttribute('src', expect.stringMatching(/^\/images\/.+\.jpg$/));
      expect(cover).toHaveAttribute('width');
      expect(cover).toHaveAttribute('height');
      fireEvent.error(cover);
      expect(cover).not.toBeInTheDocument();
      expect(screen.getByText(item.hostName)).toBeVisible();
      expect(screen.getByText('Ankara')).toBeVisible();
      expect(screen.getByText('Culture')).toBeVisible();
      await userEvent.click(screen.getByRole('link', { name: title }));
      expect(screen.getByRole('heading', { name: 'Resource details' })).toBeVisible();
    },
  );
});

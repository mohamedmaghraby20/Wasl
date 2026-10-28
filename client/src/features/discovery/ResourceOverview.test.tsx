import { axe } from 'jest-axe';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { i18n } from '@/lib/i18n';
import { ResourceOverview } from './ResourceOverview';

describe('ResourceOverview', () => {
  it('renders its public resource overview without axe violations', async () => {
    render(<main><I18nextProvider i18n={i18n}><ResourceOverview item={{
      id: 'community-1', slug: 'sample', name: 'Sample community', description: 'A public community.',
      admissionMode: 'open', hostName: 'Host', ownerType: 'user', ownerId: 'user-1',
      cityId: 'city-1', cityName: 'Ankara', categories: [],
    }} admissionLabel="admissionOpen" /></I18nextProvider></main>);
    expect((await axe(document.body)).violations).toHaveLength(0);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { ReportAction } from './ReportAction';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), report: vi.fn() }));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.auth }));
vi.mock('@/api/generated/moderation/moderation', () => ({
  useModerationControllerReport: () => ({ mutateAsync: mocks.report, isPending: false }),
}));

function renderAction(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/events/meetup']}>
          <ReportAction targetType="event" targetId="a3295dd6-b346-4210-8008-b6546789f130" />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('ReportAction', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.auth.mockReturnValue({ user: { id: 'member' } });
    mocks.report.mockResolvedValue({ id: 'report' });
  });

  it('gates signed-out reporting with a return link', () => {
    mocks.auth.mockReturnValue({ user: null });
    renderAction();
    expect(screen.getByRole('link', { name: 'Report' })).toHaveAttribute('href', '/sign-in?returnTo=%2Fevents%2Fmeetup');
  });

  it('submits a contextual target with a trimmed reason', async () => {
    renderAction();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason' }), '  Spam  ');
    await user.click(screen.getByRole('button', { name: 'Send report' }));
    expect(mocks.report).toHaveBeenCalledWith({ data: {
      targetType: 'event', targetId: 'a3295dd6-b346-4210-8008-b6546789f130', reason: 'Spam',
    } });
  });
});

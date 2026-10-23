import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messagingControllerSession } from '@/api/generated/messaging/messaging';
import { ApiError } from '@/api/fetcher';
import { i18n } from '@/lib/i18n';
import { MessagesPage } from './MessagesPage';

const stream = vi.hoisted(() => ({
  handlers: {} as Record<string, (event: { online?: boolean }) => void>,
  connectUser: vi.fn(() => Promise.resolve()),
  disconnectUser: vi.fn(() => Promise.resolve()),
  queryChannels: vi.fn(() => Promise.resolve([{ cid: 'messaging:channel-1' }])),
  on: vi.fn((event: string, handler: (payload: { online?: boolean }) => void) => {
    stream.handlers[event] = handler;
  }),
  off: vi.fn(),
}));

const api = vi.hoisted(() => ({
  user: { id: 'auth-user' },
  session: {
    data: { apiKey: 'key', userId: 'wasl-user', token: 'token' },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  conversations: {
    data: [
      {
        id: 'dm-1',
        kind: 'dm',
        channelId: 'channel-1',
        otherUserId: 'other-user',
        title: 'Mariam',
      },
    ],
    isPending: false,
    isError: false,
  },
  blocked: { data: [], isPending: false, isError: false },
  createDm: {
    mutateAsync: vi.fn(() => Promise.resolve({ channelId: 'channel-1' })),
    isPending: false,
  },
  block: { mutateAsync: vi.fn(() => Promise.resolve({})) },
  unblock: { mutateAsync: vi.fn(() => Promise.resolve({})) },
  report: { mutateAsync: vi.fn(() => Promise.resolve({})) },
}));

vi.mock('stream-chat', () => ({ StreamChat: { getInstance: () => stream } }));
vi.mock('stream-chat-react', () => ({
  Streami18n: class {
    constructor() {}
  },
  Chat: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Channel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageComposer: () => <textarea aria-label="Message" />,
  MessageList: () => <div>Recent messages</div>,
  Thread: () => null,
  Window: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: api.user }) }));
vi.mock('@/api/generated/messaging/messaging', () => ({
  useMessagingControllerSession: () => api.session,
  useMessagingControllerConversations: () => api.conversations,
  useMessagingControllerBlockedUsers: () => api.blocked,
  useMessagingControllerDirectMessage: () => api.createDm,
  useMessagingControllerBlock: () => api.block,
  useMessagingControllerUnblock: () => api.unblock,
  useMessagingControllerReport: () => api.report,
  messagingControllerSession: vi.fn(() =>
    Promise.resolve({
      apiKey: 'key',
      userId: 'wasl-user',
      token: 'renewed',
      expiresAt: '2026-10-23T00:00:00Z',
    }),
  ),
  messagingControllerConversations: vi.fn(() => Promise.resolve(api.conversations.data)),
  getMessagingControllerConversationsQueryKey: vi.fn(() => ['messagingControllerConversations']),
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MessagesPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('MessagesPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('connects through the server token provider and shows realtime conversations', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Mariam' })).toBeVisible();
    expect(screen.getByText('Recent messages')).toBeVisible();
    expect(stream.connectUser).toHaveBeenCalledWith({ id: 'wasl-user' }, expect.any(Function));
  });

  it('starts a DM from a Wasl user ID and reports failures accessibly', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Messages' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Wasl user ID' }), 'recipient-id');
    await userEvent.click(screen.getByRole('button', { name: 'Start direct message' }));
    await waitFor(() =>
      expect(api.createDm.mutateAsync).toHaveBeenCalledWith({
        data: { recipientUserId: 'recipient-id' },
      }),
    );
  });

  it('explains that messaging setup is pending when the session endpoint reports 503', async () => {
    vi.mocked(messagingControllerSession).mockRejectedValueOnce(
      new ApiError('Messaging is not configured.', 503),
    );

    renderPage();

    expect(await screen.findByText(/Messaging is not enabled yet/)).toBeVisible();
  });

  it('shows the reconnect state when the realtime connection goes offline', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Messages' });
    await waitFor(() => expect(stream.handlers['connection.changed']).toBeTypeOf('function'));

    act(() => stream.handlers['connection.changed']!({ online: false }));

    expect(await screen.findByText(/Connection lost/)).toBeVisible();
  });
});

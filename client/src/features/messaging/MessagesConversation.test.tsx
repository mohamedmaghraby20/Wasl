import type { ReactNode, ComponentProps, ComponentType } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import type { Channel, StreamChat } from 'stream-chat';
import { i18n } from '@/lib/i18n';
import MessagesConversation from './MessagesConversation';

const stream = vi.hoisted(() => ({
  remove: vi.fn(() => Promise.resolve({ id: 'message-1', type: 'deleted' })),
  update: vi.fn(),
}));

vi.mock('stream-chat-react', () => ({
  Streami18n: class {},
  Chat: ({ children }: { children: ReactNode }) => <>{children}</>,
  WithComponents: ({
    children,
    overrides,
  }: {
    children: ReactNode;
    overrides: { MessageActions: ComponentType };
  }) => (
    <>
      {children}
      <overrides.MessageActions />
    </>
  ),
  Channel: ({ children }: { children: ReactNode }) => <>{children}</>,
  Window: ({ children }: { children: ReactNode }) => <>{children}</>,
  MessageList: () => null,
  MessageComposer: () => null,
  Thread: () => null,
  defaultMessageActionSet: [{ type: 'delete', placement: 'dropdown' }],
  MessageActions: ({ messageActionSet }: { messageActionSet: { Component: ComponentType }[] }) => {
    const Action = messageActionSet[0]!.Component;
    return <Action />;
  },
  ContextMenuButton: ({ label, ...props }: ComponentProps<'button'> & { label: string }) => (
    <button {...props}>{label}</button>
  ),
  useMessageContext: () => ({ message: { id: 'message-1', text: 'Test message' } }),
  useChannelActionContext: () => ({ deleteMessage: stream.remove, updateMessage: stream.update }),
}));

describe('chat deletion workflow', () => {
  it('routes the Stream delete action through typed confirmation and completion', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MessagesConversation
          client={{} as StreamChat}
          channels={[]}
          conversations={[]}
          selected={{ cid: 'messaging:test' } as Channel}
          selectedRecord={undefined}
          isBlocked={false}
          language="en"
          direction="ltr"
          t={(key) => i18n.t(key)}
          onSelect={vi.fn()}
          onBack={vi.fn()}
          onReport={vi.fn()}
          onBlock={vi.fn()}
          onUnblock={vi.fn()}
        />
      </I18nextProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete message' }));
    const dialog = within(screen.getByRole('alertdialog'));
    const remove = dialog.getByRole('button', { name: 'Delete message' });
    expect(remove).toBeDisabled();
    expect(stream.remove).not.toHaveBeenCalled();
    await user.type(dialog.getByRole('textbox'), 'Delete message');
    await user.click(remove);
    expect(await screen.findByText('Message deleted.')).toBeVisible();
    expect(stream.remove).toHaveBeenCalledWith({ id: 'message-1', text: 'Test message' });
    expect(stream.update).toHaveBeenCalledWith({ id: 'message-1', type: 'deleted' });
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

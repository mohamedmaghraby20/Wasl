import { createContext, useContext, useMemo, type ComponentProps } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { MessagingConversationItemDto } from '@/api/generated/wasl-client.schemas';
import type { StreamChat, Channel as StreamChannel } from 'stream-chat';
import {
  Chat,
  Channel,
  ContextMenuButton,
  defaultMessageActionSet,
  MessageActions,
  MessageComposer,
  MessageList,
  Streami18n,
  Thread,
  useChannelActionContext,
  useMessageContext,
  Window,
  WithComponents,
} from 'stream-chat-react';
import { useTranslation } from 'react-i18next';
import { useDeleteConfirmation, type DeleteOptions } from '@/components/ui/DeleteDialog';
import 'stream-chat-react/dist/css/index.css';
import './MessagesPage.css';
import { cn } from '@/lib/cn';

type Translator = (key: string) => string;

const DeleteRequestContext = createContext<((options: DeleteOptions) => void) | null>(null);

function DeleteMessageAction(props: ComponentProps<'button'>): React.JSX.Element {
  const requestDeletion = useContext(DeleteRequestContext);
  const { message } = useMessageContext();
  const { deleteMessage, updateMessage } = useChannelActionContext();
  const { t } = useTranslation();
  return (
    <ContextMenuButton
      {...props}
      label={t('deleteMessage')}
      variant="destructive"
      onClick={() =>
        requestDeletion?.({
          title: t('deleteMessage'),
          description: t('deleteMessageWarning'),
          confirmationText: t('deleteMessage'),
          confirmLabel: t('deleteMessage'),
          successMessage: t('messageDeleted'),
          errorMessage: t('messageDeleteError'),
          onDelete: async () => {
            const result = await deleteMessage(message);
            updateMessage(result);
          },
        })
      }
    />
  );
}

const messageActionSet = defaultMessageActionSet.map((action) =>
  'type' in action && action.type === 'delete'
    ? { ...action, Component: DeleteMessageAction }
    : action,
);
function SharedMessageActions(): React.JSX.Element {
  return <MessageActions messageActionSet={messageActionSet} />;
}

export default function MessagesConversation({
  client, channels, conversations, selected, selectedRecord, isBlocked, language, direction, t,
  onSelect, onBack, onReport, onBlock, onUnblock,
}: {
  client: StreamChat;
  channels: StreamChannel[];
  conversations: MessagingConversationItemDto[];
  selected: StreamChannel | null;
  selectedRecord: MessagingConversationItemDto | undefined;
  isBlocked: boolean;
  language: string;
  direction: string;
  t: Translator;
  onSelect: (channel: StreamChannel) => void;
  onBack: () => void;
  onReport: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}): React.JSX.Element {
  const { requestDeletion, deleteDialog } = useDeleteConfirmation();
  const streamI18n = useMemo(() => {
    const arabic = language.startsWith('ar');
    return new Streami18n({
      language: arabic ? 'ar' : 'en',
      ...(arabic ? { translationsForLanguage: {
        Actions: 'الإجراءات', Attach: 'إرفاق', Cancel: 'إلغاء', Delete: 'حذف', Edit: 'تعديل',
        Edited: 'تم التعديل', Reply: 'رد', Send: 'إرسال', Thread: 'سلسلة الردود', Threads: 'سلاسل الردود',
        'Send a message': 'أرسل رسالة', 'Send a message to start the conversation': 'أرسل رسالة لبدء المحادثة',
        'No messages found': 'لم يتم العثور على رسائل', 'aria/Message input': 'مربع كتابة الرسالة',
        'aria/There are no messages in this chat.': 'لا توجد رسائل في هذه المحادثة.',
      } } : {}),
    });
  }, [language]);

  return (
    <div dir={direction} className="wasl-messaging overflow-hidden rounded-(--shape-radius-dialog) border border-border bg-card" style={{ height: 'min(72vh, 760px)' }}>
      <DeleteRequestContext.Provider value={requestDeletion}>
        <Chat client={client} theme="str-chat__theme-light" i18nInstance={streamI18n}>
          <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(9rem,14rem)_1fr]">
            <nav aria-label={t('conversations')} className={cn('overflow-y-auto border-e border-border p-2', selected ? 'hidden md:block' : 'block')}>
              {channels.length === 0 ? <p className="p-3 text-sm">{t('noConversations')}</p> : channels.map((channel) => {
                const record = conversations.find((item) => `messaging:${item.channelId}` === channel.cid);
                const label = record?.kind === 'community' ? t('communityConversation') : record?.kind === 'event' ? t('eventConversation') : t('directConversation');
                return <button aria-current={channel.cid === selected?.cid ? 'page' : undefined} className={`mb-1 min-h-11 w-full rounded-(--shape-radius-control) px-3 py-2.5 text-start text-sm transition-colors ${channel.cid === selected?.cid ? 'bg-primary-soft font-semibold text-primary-soft-text' : 'text-text-muted hover:bg-surface-soft hover:text-text'}`} key={channel.cid} onClick={() => onSelect(channel)}>{record?.title ?? label}</button>;
              })}
            </nav>
            <div className={cn('min-h-0 flex-col', selected ? 'flex' : 'hidden md:flex')}>
              {selected ? <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
                    <Button className="md:hidden" onClick={onBack} size="sm" variant="ghost"><ArrowLeft aria-hidden="true" className="rtl:rotate-180" />{t('backToConversations')}</Button>
                    {selectedRecord?.kind === 'dm' ? <div className="ms-auto flex gap-2">
                      <Button onClick={onReport} size="sm" variant="ghost">{t('reportUser')}</Button>
                      {isBlocked ? <Button onClick={onUnblock} size="sm" variant="ghost">{t('unblockUser')}</Button> : <Button onClick={onBlock} size="sm" variant="ghost">{t('blockUser')}</Button>}
                    </div> : null}
                  </div>
                  {isBlocked ? <p className="m-auto p-5 text-center">{t('conversationBlocked')}</p> : <WithComponents overrides={{ MessageActions: SharedMessageActions }}><Channel channel={selected}><Window><MessageList /><MessageComposer /><Thread /></Window></Channel></WithComponents>}
              </> : <p className="m-auto p-5 text-center text-sm text-text-muted">{t('selectConversation')}</p>}
            </div>
          </div>
        </Chat>
      </DeleteRequestContext.Provider>
      {deleteDialog}
    </div>
  );
}

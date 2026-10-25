import { useEffect, useMemo, useState } from 'react';
import { StreamChat, type Channel as StreamChannel } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageComposer,
  MessageList,
  Streami18n,
  Thread,
  Window,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import './MessagesPage.css';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUsersControllerSearch } from '@/api/generated/users/users';
import {
  useMessagingControllerBlock,
  useMessagingControllerBlockedUsers,
  useMessagingControllerConversations,
  useMessagingControllerDirectMessage,
  useMessagingControllerReport,
  useMessagingControllerUnblock,
  messagingControllerSession,
  messagingControllerConversations,
  getMessagingControllerConversationsQueryKey,
} from '@/api/generated/messaging/messaging';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TextPromptDialog } from '@/components/ui/TextPromptDialog';
import { QueryError } from '@/components/feedback/QueryError';
import { ApiError } from '@/api/fetcher';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { useSearchParams } from 'react-router';

export function MessagesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const conversations = useMessagingControllerConversations({
    query: { enabled: Boolean(user), retry: false },
  });
  const createDm = useMessagingControllerDirectMessage();
  const block = useMessagingControllerBlock();
  const unblock = useMessagingControllerUnblock();
  const report = useMessagingControllerReport();
  const blockedUsers = useMessagingControllerBlockedUsers({
    query: { enabled: Boolean(user), retry: false },
  });
  const [searchParams] = useSearchParams();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof messagingControllerSession>
  > | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(user));
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [sessionRetry, setSessionRetry] = useState(0);
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [selected, setSelected] = useState<StreamChannel | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [recipientLabel, setRecipientLabel] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [debouncedRecipientQuery, setDebouncedRecipientQuery] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline' | 'error'>(
    'connecting',
  );
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [channelRetry, setChannelRetry] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState(false);
  const people = useUsersControllerSearch(
    { q: debouncedRecipientQuery },
    {
      query: {
        enabled: Boolean(user) && debouncedRecipientQuery.trim().length >= 2,
        retry: false,
      },
    },
  );

  useEffect(() => {
    const target = searchParams.get('to');
    if (target) {
      setRecipientId(target);
      setRecipientLabel(t('directConversation'));
    }
  }, [searchParams, t]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedRecipientQuery(recipientQuery.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [recipientQuery]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);
    void messagingControllerSession()
      .then((value) => {
        if (!cancelled) setSession(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setSessionError(reason);
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, sessionRetry]);

  useEffect(() => {
    const auth = session;
    if (!auth || !user) return;
    let cancelled = false;
    const stream = StreamChat.getInstance(auth.apiKey);
    const onConnectionChanged = (event: { online?: boolean }) =>
      setStatus(event.online === false ? 'offline' : 'connected');
    let initialToken = true;
    const tokenProvider = async () => {
      if (initialToken) {
        initialToken = false;
        return auth.token;
      }
      return (await messagingControllerSession()).token;
    };
    void stream
      .connectUser({ id: auth.userId }, tokenProvider)
      .then(async () => {
        const latestConversations = await messagingControllerConversations();
        if (cancelled) {
          await stream.disconnectUser();
          return;
        }
        queryClient.setQueryData(
          getMessagingControllerConversationsQueryKey(),
          latestConversations,
        );
        setClient(stream);
        setStatus('connected');
        stream.on('connection.changed', onConnectionChanged);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      stream.off('connection.changed', onConnectionChanged);
      if (stream.userID) void stream.disconnectUser();
    };
  }, [session, user, queryClient]);

  useEffect(() => {
    if (!client || !conversations.data) return;
    if (conversations.data.length === 0) {
      setChannels([]);
      setSelected(null);
      return;
    }
    let cancelled = false;
    const cids = conversations.data.map((conversation) => `messaging:${conversation.channelId}`);
    void client
      .queryChannels(
        { $and: [{ cid: { $in: cids } }, { members: { $in: [session?.userId ?? ''] } }] },
        { last_message_at: -1 },
        { watch: true, state: true },
      )
      .then((found) => {
        if (cancelled) return;
        setChannels(found);
        setSelected((current) =>
          current
            ? (found.find((channel) => channel.cid === current.cid) ?? null)
            : (found[0] ?? null),
        );
        setStatus('connected');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [client, conversations.data, channelRetry]);

  const currentCid = selected?.cid;
  const streamI18n = useMemo(() => {
    const arabic = i18n.language.startsWith('ar');
    return new Streami18n({
      language: arabic ? 'ar' : 'en',
      ...(arabic
        ? {
            translationsForLanguage: {
              Actions: 'الإجراءات',
              Attach: 'إرفاق',
              Cancel: 'إلغاء',
              Delete: 'حذف',
              Edit: 'تعديل',
              Edited: 'تم التعديل',
              Reply: 'رد',
              Send: 'إرسال',
              Thread: 'سلسلة الردود',
              Threads: 'سلاسل الردود',
              'Send a message': 'أرسل رسالة',
              'Send a message to start the conversation': 'أرسل رسالة لبدء المحادثة',
              'No messages found': 'لم يتم العثور على رسائل',
              'aria/Message input': 'مربع كتابة الرسالة',
              'aria/There are no messages in this chat.': 'لا توجد رسائل في هذه المحادثة.',
            },
          }
        : {}),
    });
  }, [i18n.language]);
  const selectedRecord = useMemo(
    () =>
      conversations.data?.find(
        (conversation) => `messaging:${conversation.channelId}` === currentCid,
      ),
    [conversations.data, currentCid],
  );
  const otherUserId = selectedRecord?.otherUserId ?? undefined;
  const isBlocked = Boolean(
    otherUserId && blockedUsers.data?.some((item) => item.userId === otherUserId),
  );

  const startDm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipientId) return;
    setError(false);
    setSuccess(false);
    try {
      const channel = await createDm.mutateAsync({ data: { recipientUserId: recipientId } });
      setRecipientId('');
      setRecipientLabel('');
      setRecipientQuery('');
      setDebouncedRecipientQuery('');
      await queryClient.invalidateQueries();
      const ready = await client?.queryChannels(
        {
          $and: [
            { cid: { $in: [`messaging:${channel.channelId}`] } },
            { members: { $in: [session?.userId ?? ''] } },
          ],
        },
        {},
        { watch: true, state: true },
      );
      const next = ready?.[0];
      if (next) {
        setChannels((existing) => [next, ...existing.filter((item) => item.cid !== next.cid)]);
        setSelected(next);
      }
    } catch {
      setError(true);
    }
  };

  const runBlock = async () => {
    if (!otherUserId) return;
    setError(false);
    setSuccess(false);
    try {
      const result = await block.mutateAsync({ data: { userId: otherUserId } });
      setSyncPending(Boolean(result.syncPending));
      await queryClient.invalidateQueries();
      setSelected(null);
    } catch {
      setError(true);
    }
  };
  const runUnblock = async (targetId = otherUserId) => {
    if (!targetId) return;
    setError(false);
    setSuccess(false);
    try {
      const result = await unblock.mutateAsync({ userId: targetId });
      setSyncPending(Boolean(result.syncPending));
      await queryClient.invalidateQueries();
    } catch {
      setError(true);
    }
  };
  const runReport = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedRecord) return;
    const reason = reportReason.trim();
    if (!reason) return;
    setError(false);
    setReportError(false);
    setSuccess(false);
    try {
      await report.mutateAsync({ id: selectedRecord.id, data: { reason } });
      setSuccess(true);
      setReportOpen(false);
      setReportReason('');
    } catch {
      setError(true);
      setReportError(true);
    }
  };
  const retry = () => {
    if (client) {
      setStatus('connecting');
      setChannelRetry((value) => value + 1);
    } else {
      setStatus('connecting');
      setSessionRetry((value) => value + 1);
      void conversations.refetch();
      void blockedUsers.refetch();
    }
  };

  if (!user)
    return (
      <p>
        <Link
          className="font-semibold underline"
          to={{
            pathname: '/sign-in',
            search: `?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`,
          }}
        >
          {t('signInToMessages')}
        </Link>
      </p>
    );
  if (sessionLoading || conversations.isPending || blockedUsers.isPending)
    return <p role="status">{t('loadingMessages')}</p>;
  if (
    sessionError ||
    !session ||
    conversations.isError ||
    blockedUsers.isError ||
    status === 'error'
  )
    return (
      <QueryError
        message={
          sessionError instanceof ApiError && sessionError.status === 503
            ? t('messagesSetupPending')
            : t('messagesUnavailable')
        }
        onRetry={retry}
      />
    );
  if (status === 'connecting' || !client) return <p role="status">{t('loadingMessages')}</p>;

  return (
    <section
      className="mx-auto grid max-w-(--container-reading) gap-4"
      aria-labelledby="messages-title"
    >
      <h1 className="text-3xl font-extrabold" id="messages-title">
        {t('messages')}
      </h1>
      <p
        className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-soft px-3 py-1 text-xs font-medium text-text-muted"
        role="status"
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${status === 'offline' ? 'bg-warning' : 'bg-success'}`}
        />
        {status === 'offline' ? t('messagesOffline') : t('messagesConnected')}
      </p>
      <form
        className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4 shadow-xs sm:flex sm:items-end"
        onSubmit={(event) => void startDm(event)}
      >
        <Field className="flex-1" id="dm-recipient" label={t('findPerson')}>
          <SearchableSelect
            emptyMessage={
              recipientQuery.trim().length < 2 ? t('searchPeopleHint') : t('noPeopleFound')
            }
            id="dm-recipient"
            loading={people.isFetching && debouncedRecipientQuery.length >= 2}
            onSearch={setRecipientQuery}
            onValueChange={(value) => {
              const person = people.data?.find((item) => item.id === value);
              setRecipientId(value);
              setRecipientLabel(person?.displayName ?? '');
              setRecipientQuery('');
              setDebouncedRecipientQuery('');
            }}
            options={(debouncedRecipientQuery.length >= 2 ? (people.data ?? []) : []).map(
              (person) => ({
                value: person.id,
                label: person.displayName,
              }),
            )}
            placeholder={t('findPerson')}
            searchPlaceholder={t('searchPeople')}
            selectedLabel={recipientLabel}
            value={recipientId}
          />
        </Field>
        <Button disabled={!recipientId || createDm.isPending}>
          <MessageSquarePlus aria-hidden="true" />
          {t('startDirectMessage')}
        </Button>
      </form>
      {blockedUsers.data?.length ? (
        <details className="rounded-(--shape-radius-card) border border-border bg-card p-4 shadow-xs">
          <summary className="cursor-pointer text-sm font-semibold text-text">
            {t('blockedPeople')}
          </summary>
          <ul className="mt-3 grid gap-2">
            {blockedUsers.data.map((item) => (
              <li className="flex flex-wrap items-center justify-between gap-2" key={item.userId}>
                <span className="text-sm text-text">{item.displayName}</span>
                <Button
                  disabled={unblock.isPending}
                  onClick={() => void runUnblock(item.userId)}
                  size="sm"
                  variant="outline"
                >
                  {t('unblockUser')}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {error ? (
        <p
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          role="alert"
        >
          {t('messagingActionError')}
        </p>
      ) : null}
      {syncPending ? (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" role="status">
          {t('messagingSyncPending')}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success" role="status">
          {t('messageReported')}
        </p>
      ) : null}
      <div
        dir={i18n.dir()}
        className="wasl-messaging overflow-hidden rounded-(--shape-radius-dialog) border border-border bg-card"
        style={{ height: 'min(72vh, 760px)' }}
      >
        <Chat client={client} theme="str-chat__theme-light" i18nInstance={streamI18n}>
          <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(9rem,14rem)_1fr]">
            <nav
              aria-label={t('conversations')}
              className={cn(
                'overflow-y-auto border-e border-border p-2',
                selected ? 'hidden md:block' : 'block',
              )}
            >
              {channels.length === 0 ? (
                <p className="p-3 text-sm">{t('noConversations')}</p>
              ) : (
                channels.map((channel) => {
                  const record = conversations.data?.find(
                    (item) => `messaging:${item.channelId}` === channel.cid,
                  );
                  const label =
                    record?.kind === 'community'
                      ? t('communityConversation')
                      : record?.kind === 'event'
                        ? t('eventConversation')
                        : t('directConversation');
                  return (
                    <button
                      aria-current={channel.cid === selected?.cid ? 'page' : undefined}
                      className={`mb-1 min-h-11 w-full rounded-(--shape-radius-control) px-3 py-2.5 text-start text-sm transition-colors ${channel.cid === selected?.cid ? 'bg-primary-soft font-semibold text-primary-soft-text' : 'text-text-muted hover:bg-surface-soft hover:text-text'}`}
                      key={channel.cid}
                      onClick={() => setSelected(channel)}
                    >
                      {record?.title ?? label}
                    </button>
                  );
                })
              )}
            </nav>
            <div
              className={cn(
                'min-h-0 flex-col',
                selected ? 'flex' : 'hidden md:flex',
              )}
            >
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
                    <Button
                      className="md:hidden"
                      onClick={() => setSelected(null)}
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                      {t('backToConversations')}
                    </Button>
                    {selectedRecord?.kind === 'dm' ? (
                      <div className="ms-auto flex gap-2">
                        <Button
                          onClick={() => {
                            setReportError(false);
                            setSuccess(false);
                            setReportOpen(true);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          {t('reportUser')}
                        </Button>
                        {isBlocked ? (
                          <Button onClick={() => void runUnblock()} size="sm" variant="ghost">
                            {t('unblockUser')}
                          </Button>
                        ) : (
                          <Button onClick={() => void runBlock()} size="sm" variant="ghost">
                            {t('blockUser')}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {isBlocked ? (
                    <p className="m-auto p-5 text-center">{t('conversationBlocked')}</p>
                  ) : (
                    <Channel channel={selected}>
                      <Window>
                        <MessageList />
                        <MessageComposer />
                        <Thread />
                      </Window>
                    </Channel>
                  )}
                </>
              ) : (
                <p className="m-auto p-5 text-center text-sm text-text-muted">
                  {t('selectConversation')}
                </p>
              )}
            </div>
          </div>
        </Chat>
      </div>
      <TextPromptDialog
        description={t('messageReportReason')}
        error={reportError ? t('messagingActionError') : undefined}
        label={t('reportReasonLabel')}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) {
            setReportReason('');
            setReportError(false);
          }
        }}
        onSubmit={(event) => void runReport(event)}
        onValueChange={setReportReason}
        open={reportOpen}
        pending={report.isPending}
        submitLabel={t('reportUser')}
        title={t('reportUser')}
        value={reportReason}
      />
    </section>
  );
}

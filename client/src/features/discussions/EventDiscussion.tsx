import { Pencil, Reply, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  getDiscussionsControllerListEventPostsQueryKey,
  useDiscussionsControllerCreateEventPost,
  useDiscussionsControllerClose,
  useDiscussionsControllerListEventPosts,
  useDiscussionsControllerRemove,
  useDiscussionsControllerUpdate,
} from '@/api/generated/discussions/discussions';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { QueryError } from '@/components/feedback/QueryError';
import { ReportAction } from '@/features/moderation/ReportAction';

export function EventDiscussion({
  eventId,
  signedIn = false,
  canPost = false,
  returnTo = '',
  viewerId,
  moderator = false,
  canEditOthers = false,
}: {
  eventId: string;
  signedIn?: boolean;
  canPost?: boolean;
  returnTo?: string;
  viewerId?: string | undefined;
  moderator?: boolean;
  canEditOthers?: boolean;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState(false);
  const [posted, setPosted] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const query = useDiscussionsControllerListEventPosts(eventId, { page });
  const createPost = useDiscussionsControllerCreateEventPost();
  const updatePost = useDiscussionsControllerUpdate();
  const removePost = useDiscussionsControllerRemove();
  const closeDiscussion = useDiscussionsControllerClose();
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getDiscussionsControllerListEventPostsQueryKey(eventId).slice(0, 1),
    });

  const saveEdit = async () => {
    if (!editing?.body.trim()) return;
    setError(false);
    try {
      await updatePost.mutateAsync({
        id: eventId,
        postId: editing.id,
        data: { body: editing.body.trim() },
      });
      setEditing(null);
      await refresh();
    } catch {
      setError(true);
    }
  };
  const remove = async (postId: string) => {
    if (
      !(await confirm({
        title: t('removeComment'),
        description: t('confirmRemoveComment'),
        confirmLabel: t('removeComment'),
        destructive: true,
      }))
    )
      return;
    setError(false);
    try {
      await removePost.mutateAsync({ id: eventId, postId });
      await refresh();
    } catch {
      setError(true);
    }
  };
  const close = async () => {
    if (
      !(await confirm({
        title: t('closeDiscussion'),
        description: t('confirmCloseDiscussion'),
        confirmLabel: t('closeDiscussion'),
      }))
    )
      return;
    setError(false);
    try {
      await closeDiscussion.mutateAsync({ id: eventId });
      await refresh();
    } catch {
      setError(true);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!body.trim()) return;
    setError(false);
    setPosted(false);
    try {
      await createPost.mutateAsync({
        id: eventId,
        data: { body: body.trim(), ...(replyTo ? { parentId: replyTo.id } : {}) },
      });
      setBody('');
      setReplyTo(null);
      setPosted(true);
      setPage(Math.ceil(((query.data?.total ?? 0) + 1) / 20));
      await refresh();
    } catch {
      setError(true);
    }
  };

  return (
    <section
      aria-labelledby="event-discussion-title"
      className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="event-discussion-title">
          {t('eventDiscussion')}
        </h2>
        {moderator && query.data && !query.data.closed ? (
          <Button
            disabled={closeDiscussion.isPending}
            onClick={() => void close()}
            size="sm"
            variant="outline"
          >
            {t('closeDiscussion')}
          </Button>
        ) : null}
      </div>
      {query.data?.closed ? (
        <p className="rounded-lg bg-surface-soft px-3 py-2 text-sm text-text-muted" role="status">
          {t('discussionClosed')}
        </p>
      ) : null}
      {query.isPending ? (
        <p className="text-sm text-text-muted" role="status">
          {t('loadingDiscussion')}
        </p>
      ) : query.isError ? (
        <QueryError message={t('discussionLoadError')} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 && page === 1 ? (
        <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-text-muted">
          {t('noDiscussionPosts')}
        </p>
      ) : (
        <>
          <ol className="grid gap-4">
            {query.data.items.map((post) => (
              <li
                className={`grid gap-2 rounded-lg border-s-2 border-primary/30 ps-4 ${post.parentId ? 'ms-5' : ''}`}
                key={post.id}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    className="w-fit text-sm font-semibold text-text transition-colors hover:text-primary-soft-text"
                    to={`/users/${post.authorId}`}
                  >
                    {post.authorName}
                  </Link>
                  <time className="text-xs text-text-subtle" dateTime={post.createdAt}>
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Istanbul',
                    }).format(new Date(post.createdAt))}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                  {post.body ?? t('discussionPostRemoved')}
                </p>
                {editing?.id === post.id ? (
                  <div className="grid gap-3 rounded-lg bg-surface-soft p-3">
                    <Field id={`edit-post-${post.id}`} label={t('editComment')}>
                      <Textarea
                        id={`edit-post-${post.id}`}
                        maxLength={5000}
                        onChange={(event) => setEditing({ id: post.id, body: event.target.value })}
                        value={editing.body}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        disabled={updatePost.isPending || !editing.body.trim()}
                        onClick={() => void saveEdit()}
                        size="sm"
                      >
                        {t('saveChanges')}
                      </Button>
                      <Button onClick={() => setEditing(null)} size="sm" variant="outline">
                        {t('cancelReply')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {(moderator || viewerId === post.authorId) && post.body ? (
                  <div className="flex flex-wrap gap-2">
                    {canEditOthers || (viewerId === post.authorId && canPost) ? (
                      <Button
                        onClick={() => setEditing({ id: post.id, body: post.body! })}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" />
                        {t('editComment')}
                      </Button>
                    ) : null}
                    <Button
                      disabled={removePost.isPending}
                      onClick={() => void remove(post.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                      {t('removeComment')}
                    </Button>
                  </div>
                ) : null}
                {post.body && viewerId !== post.authorId ? <ReportAction targetType="post" targetId={post.id} /> : null}
                {canPost && !post.parentId && post.body ? (
                  <Button
                    className="w-fit"
                    onClick={() => setReplyTo({ id: post.id, name: post.authorName })}
                    size="sm"
                    variant="outline"
                  >
                    <Reply aria-hidden="true" className="rtl:rotate-180" />
                    {t('replyToDiscussionPost')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
          {page > 1 || query.data.hasMore ? (
            <nav
              aria-label={t('discussionPages')}
              className="flex gap-2 border-t border-border pt-4"
            >
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                {t('previousPage')}
              </Button>
              <Button
                disabled={!query.data.hasMore}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                {t('nextPage')}
              </Button>
            </nav>
          ) : null}
        </>
      )}
      {error && !canPost ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {t('discussionPostError')}
        </p>
      ) : null}
      {canPost && !query.data?.closed ? (
        <form
          className="grid gap-3 rounded-lg bg-surface-soft p-4"
          onSubmit={(event) => void submit(event)}
        >
          {replyTo ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-text">
              <span className="font-medium">{t('replyingTo', { name: replyTo.name })}</span>
              <Button onClick={() => setReplyTo(null)} size="sm" type="button" variant="ghost">
                {t('cancelReply')}
              </Button>
            </div>
          ) : null}
          <Field id="event-comment" label={t('writeEventComment')} required>
            <Textarea
              id="event-comment"
              maxLength={5000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </Field>
          {error ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {t('discussionPostError')}
            </p>
          ) : null}
          {posted ? (
            <p className="text-sm font-medium text-success" role="status">
              {t('discussionPostSuccess')}
            </p>
          ) : null}
          <Button className="w-fit" disabled={createPost.isPending || !body.trim()}>
            {t('postEventComment')}
          </Button>
        </form>
      ) : query.data?.closed ? null : signedIn ? (
        <p className="text-sm text-text-muted">{t('discussionPostingEligibility')}</p>
      ) : (
        <Link
          className="w-fit text-sm font-semibold text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary"
          to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {t('signInToComment')}
        </Link>
      )}
      {dialog}
    </section>
  );
}

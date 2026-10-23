import { ArrowLeft, Pencil, Reply, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCommunityDiscussionsControllerDetailsQueryKey,
  useCommunityDiscussionsControllerDetails,
  useCommunityDiscussionsControllerPost,
  useCommunityDiscussionsControllerClose,
  useCommunityDiscussionsControllerUpdate,
  useCommunityDiscussionsControllerRemove,
} from '@/api/generated/discussions/discussions';
import { useCommunitiesControllerMine } from '@/api/generated/communities/communities';
import { useParticipationControllerCommunityStatus } from '@/api/generated/participation/participation';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import { ApiError } from '@/api/fetcher';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { QueryError } from '@/components/feedback/QueryError';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';

export function CommunityTopicPage(): React.JSX.Element {
  const { id = '', topicId = '' } = useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState(false);
  const [posted, setPosted] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const queryClient = useQueryClient();
  const query = useCommunityDiscussionsControllerDetails(id, topicId, { page });
  const membership = useParticipationControllerCommunityStatus(id, {
    query: { enabled: Boolean(user && id) },
  });
  const managed = useCommunitiesControllerMine({ query: { enabled: Boolean(user) } });
  const create = useCommunityDiscussionsControllerPost();
  const close = useCommunityDiscussionsControllerClose();
  const update = useCommunityDiscussionsControllerUpdate();
  const remove = useCommunityDiscussionsControllerRemove();
  const currentUser = useUsersControllerCurrent({}, { query: { enabled: Boolean(user) } });
  const isManager = Boolean(managed.data?.some((community) => community.id === id));
  const canPost = Boolean(
    user && !query.data?.archived && (isManager || membership.data?.status === 'ACTIVE'),
  );
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getCommunityDiscussionsControllerDetailsQueryKey(id, topicId).slice(0, 1),
    });
  const closeTopic = async () => {
    if (!window.confirm(t('confirmCloseTopic'))) return;
    try {
      await close.mutateAsync({ id, topicId });
      await refresh();
    } catch {
      setError(true);
    }
  };
  const saveEdit = async () => {
    if (!editing?.body.trim()) return;
    try {
      await update.mutateAsync({
        id,
        topicId,
        postId: editing.id,
        data: { body: editing.body.trim() },
      });
      setEditing(null);
      await refresh();
    } catch {
      setError(true);
    }
  };
  const removePost = async (postId: string) => {
    if (!window.confirm(t('confirmRemoveComment'))) return;
    try {
      await remove.mutateAsync({ id, topicId, postId });
      await refresh();
    } catch {
      setError(true);
    }
  };
  usePageMetadata(
    query.data?.title ?? t('communityTopics'),
    query.data?.body ?? t('discoverIntro'),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;
    setError(false);
    setPosted(false);
    try {
      await create.mutateAsync({
        id,
        topicId,
        data: { body: body.trim(), ...(replyTo ? { parentId: replyTo.id } : {}) },
      });
      setBody('');
      setReplyTo(null);
      setPosted(true);
      setPage(Math.ceil(((query.data?.posts.total ?? 0) + 1) / 20));
      await refresh();
    } catch {
      setError(true);
    }
  };

  if (query.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingTopics')}
      </p>
    );
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404)
      return (
        <p className="rounded-(--shape-radius-card) border border-border bg-card p-5" role="alert">
          {t('topicNotFound')}
        </p>
      );
    return <QueryError message={t('topicsLoadError')} onRetry={() => void query.refetch()} />;
  }
  const topic = query.data;
  return (
    <article className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to={`/communities/${id}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('backToCommunity')}
      </Link>

      <header className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{topic.title}</h1>
        <p className="text-xs font-medium text-text-subtle">
          {t('topicBy', { name: topic.authorName })}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{topic.body}</p>
        {isManager && !topic.archived ? (
          <Button
            className="w-fit"
            disabled={close.isPending}
            onClick={() => void closeTopic()}
            size="sm"
            variant="outline"
          >
            {t('closeTopic')}
          </Button>
        ) : null}
      </header>

      <section
        aria-labelledby="topic-replies"
        className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs"
      >
        <h2 className="text-lg font-semibold" id="topic-replies">
          {t('topicReplies')}
        </h2>
        {topic.posts.items.length === 0 ? (
          <p className="text-sm text-text-muted">{t('noDiscussionPosts')}</p>
        ) : (
          <ol className="grid gap-4">
            {topic.posts.items.map((post) => (
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
                    <Field id={`edit-topic-post-${post.id}`} label={t('editComment')}>
                      <Textarea
                        id={`edit-topic-post-${post.id}`}
                        maxLength={5000}
                        onChange={(event) => setEditing({ id: post.id, body: event.target.value })}
                        value={editing.body}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        disabled={update.isPending || !editing.body.trim()}
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
                {(isManager || currentUser.data?.id === post.authorId) && post.body ? (
                  <div className="flex flex-wrap gap-2">
                    {isManager || canPost ? (
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
                      disabled={remove.isPending}
                      onClick={() => void removePost(post.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                      {t('removeComment')}
                    </Button>
                  </div>
                ) : null}
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
        )}
        <nav aria-label={t('topicPages')} className="flex gap-2 border-t border-border pt-4">
          <Button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            size="sm"
            variant="outline"
          >
            {t('previousPage')}
          </Button>
          <Button
            disabled={!topic.posts.hasMore}
            onClick={() => setPage(page + 1)}
            size="sm"
            variant="outline"
          >
            {t('nextPage')}
          </Button>
        </nav>
      </section>

      {canPost ? (
        <form
          className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-5 shadow-xs"
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
          <Field id="topic-comment" label={t('writeEventComment')} required>
            <Textarea
              id="topic-comment"
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
          <Button className="w-fit" disabled={!body.trim() || create.isPending}>
            {t('postEventComment')}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-text-muted">{t('communityPostingEligibility')}</p>
      )}
      {error && !canPost ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {t('discussionPostError')}
        </p>
      ) : null}
    </article>
  );
}

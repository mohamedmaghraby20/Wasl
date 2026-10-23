import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCommunityDiscussionsControllerListQueryKey,
  useCommunityDiscussionsControllerCreate,
  useCommunityDiscussionsControllerList,
} from '@/api/generated/discussions/discussions';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { QueryError } from '@/components/feedback/QueryError';

export function CommunityTopics({
  communityId,
  canPost,
}: {
  communityId: string;
  canPost: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useCommunityDiscussionsControllerList(communityId, { page });
  const create = useCommunityDiscussionsControllerCreate();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(false);
    try {
      const topic = await create.mutateAsync({
        id: communityId,
        data: { title: title.trim(), body: body.trim() },
      });
      await queryClient.invalidateQueries({
        queryKey: getCommunityDiscussionsControllerListQueryKey(communityId).slice(0, 1),
      });
      void navigate(`/communities/${communityId}/topics/${topic.id}`);
    } catch {
      setError(true);
    }
  };

  return (
    <section className="grid gap-4" aria-labelledby="community-topics-title">
      <h2 className="text-xl font-bold" id="community-topics-title">
        {t('communityTopics')}
      </h2>
      {query.isPending ? (
        <p className="text-sm text-text-muted" role="status">
          {t('loadingTopics')}
        </p>
      ) : query.isError ? (
        <QueryError message={t('topicsLoadError')} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 && page === 1 ? (
        <p className="rounded-(--shape-radius-card) border border-dashed border-border p-5 text-sm text-text-muted">
          {t('noCommunityTopics')}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-xs">
            {query.data.items.map((topic) => (
              <li className="px-4 py-3.5 transition-colors hover:bg-surface-soft" key={topic.id}>
                <Link
                  className="font-semibold text-text transition-colors hover:text-primary-soft-text"
                  to={`/communities/${communityId}/topics/${topic.id}`}
                >
                  {topic.title}
                </Link>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-text-muted">
                  {topic.body}
                </p>
              </li>
            ))}
          </ul>
          <nav aria-label={t('topicPages')} className="flex gap-2">
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
        </>
      )}
      {canPost ? (
        <form
          aria-labelledby="start-topic-heading"
          className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5 shadow-xs"
          onSubmit={(event) => void submit(event)}
        >
          <h3 className="text-base font-semibold" id="start-topic-heading">
            {t('startTopic')}
          </h3>
          <Field id="topic-title" label={t('topicTitle')} required>
            <Input
              id="topic-title"
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </Field>
          <Field id="topic-body" label={t('topicBody')} required>
            <Textarea
              id="topic-body"
              maxLength={5000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </Field>
          {error ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {t('topicCreateError')}
            </p>
          ) : null}
          <Button className="w-fit" disabled={create.isPending || !title.trim() || !body.trim()}>
            {t('createTopic')}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

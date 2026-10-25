import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import {
  getNotificationsControllerListQueryKey,
  useNotificationsControllerList,
  useNotificationsControllerMarkRead,
} from '@/api/generated/notifications/notifications';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/feedback/QueryError';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';

export function NotificationsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useNotificationsControllerList({ query: { enabled: Boolean(user) } });
  const markRead = useNotificationsControllerMarkRead();
  usePageMetadata(t('notifications'), t('notificationsDescription'), { noindex: true });

  if (!loading && !user) return <Navigate replace to="/sign-in?returnTo=%2Fnotifications" />;
  if (notifications.isPending) return <p role="status">{t('loadingNotifications')}</p>;
  if (notifications.isError)
    return (
      <QueryError
        message={t('loadNotificationsError')}
        onRetry={() => void notifications.refetch()}
      />
    );

  const read = async (id: string) => {
    try {
      await markRead.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getNotificationsControllerListQueryKey() });
    } catch {
      toast.error(t('readNotificationError'));
    }
  };

  return (
    <div className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('notifications')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('notificationsDescription')}</p>
      </header>
      {notifications.data?.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-(--shape-radius-card) border border-border bg-card shadow-xs">
          {notifications.data.map((item) => (
            <li
              className="flex flex-wrap items-start justify-between gap-4 px-4 py-4"
              key={item.id}
            >
              <div className="grid min-w-0 gap-1.5">
                <span className="flex items-center gap-2 font-semibold">
                  {!item.readAt ? (
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      aria-label={t('unreadNotification')}
                    />
                  ) : null}
                  {t(`noticeType_${item.type}`, { defaultValue: t('notificationUpdate') })}
                </span>
                <time className="text-xs text-text-muted" dateTime={item.createdAt}>
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(item.createdAt))}
                </time>
                {item.href ? (
                  <Link
                    className="w-fit text-sm font-medium text-primary hover:underline"
                    to={item.href}
                  >
                    {t('viewNotificationContext')}
                  </Link>
                ) : null}
              </div>
              {!item.readAt ? (
                <Button
                  disabled={markRead.isPending}
                  onClick={() => void read(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  {t('markNotificationRead')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title={t('noNotifications')}
          description={t('noNotificationsDescription')}
        />
      )}
    </div>
  );
}

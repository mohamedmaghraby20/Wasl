import { RotateCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

export function RouteErrorBoundary(): React.JSX.Element {
  const error = useRouteError();
  const { t } = useTranslation();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto grid min-h-screen max-w-(--container-reading) content-center gap-4 px-4 py-10 text-center">
      <h1 className="text-3xl font-bold">{t(isNotFound ? 'notFound' : 'routeErrorTitle')}</h1>
      <p className="text-[color:var(--color-text-muted)]">
        {t(isNotFound ? 'routeNotFoundDescription' : 'routeErrorDescription')}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/">{t('backHome')}</Link>
        </Button>
        {!isNotFound && (
          <IconButton icon={RotateCw} label={t('reloadPage')} onClick={() => window.location.reload()} type="button" variant="outline" />
        )}
      </div>
    </main>
  );
}

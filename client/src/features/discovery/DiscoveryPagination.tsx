import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function DiscoveryPagination({
  page,
  canGoForward,
  onPageChange,
}: {
  page: number;
  canGoForward: boolean;
  onPageChange: (page: number) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('pagination')} className="flex items-center justify-between gap-4">
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} variant="outline">
        {t('previousPage')}
      </Button>
      <span aria-live="polite">{t('pageNumber', { page })}</span>
      <Button disabled={!canGoForward} onClick={() => onPageChange(page + 1)} variant="outline">
        {t('nextPage')}
      </Button>
    </nav>
  );
}

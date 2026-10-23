import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-center gap-2 border-t border-border pt-4"
    >
      <Button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        size="sm"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        {t('previousPage')}
      </Button>
      <span
        aria-live="polite"
        className="min-w-24 text-center text-sm font-medium text-text-muted"
      >
        {t('pageNumber', { page })}
      </span>
      <Button
        disabled={!canGoForward}
        onClick={() => onPageChange(page + 1)}
        size="sm"
        variant="outline"
      >
        {t('nextPage')}
        <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

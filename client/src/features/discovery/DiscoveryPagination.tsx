import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';

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
      <IconButton
        icon={ChevronLeft}
        label={t('previousPage')}
        className="[&_svg]:rtl:rotate-180"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        variant="outline"
      />
      <span
        aria-live="polite"
        className="min-w-24 text-center text-sm font-medium text-text-muted"
      >
        {t('pageNumber', { page })}
      </span>
      <IconButton
        icon={ChevronRight}
        label={t('nextPage')}
        className="[&_svg]:rtl:rotate-180"
        disabled={!canGoForward}
        onClick={() => onPageChange(page + 1)}
        variant="outline"
      />
    </nav>
  );
}

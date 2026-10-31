import { RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';

export function QueryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-(--shape-radius-control) border border-border bg-card p-4"
      role="alert"
    >
      <p>{message}</p>
      <IconButton icon={RotateCw} label={t('retry')} onClick={onRetry} type="button" variant="outline" />
    </div>
  );
}

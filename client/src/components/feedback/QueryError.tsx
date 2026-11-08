import { CircleAlert, RotateCw } from 'lucide-react';
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
      className="flex flex-wrap items-center gap-3 rounded-(--shape-radius-lg) border border-danger/30 bg-danger-soft p-4 text-sm"
      role="alert"
    >
      <span className="grid size-(--alert-icon-size) shrink-0 place-items-center rounded-full bg-danger text-white">
        <CircleAlert aria-hidden="true" className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-text">{message}</p>
      <IconButton
        icon={RotateCw}
        label={t('retry')}
        onClick={onRetry}
        type="button"
        variant="outline"
      />
    </div>
  );
}

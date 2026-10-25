import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './AlertDialog';
import { Button } from './Button';

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string | undefined;
  destructive?: boolean | undefined;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  onConfirm: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className="flex gap-4">
          <span
            className={
              destructive
                ? 'grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger'
                : 'grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-text'
            }
          >
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <div className="grid gap-1.5">
            <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-text-muted">
              {description}
            </AlertDialogDescription>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel asChild>
            <Button disabled={pending} type="button" variant="outline">
              {t('cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              aria-busy={pending}
              disabled={pending}
              onClick={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
            >
              {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {confirmLabel ?? t('confirmAction')}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  dialog: React.JSX.Element;
} {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOptions(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  return {
    confirm,
    dialog: (
      <ConfirmDialog
        description={options?.description ?? ''}
        destructive={options?.destructive}
        onConfirm={() => settle(true)}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        open={options !== null}
        title={options?.title ?? ''}
        {...(options?.confirmLabel ? { confirmLabel: options.confirmLabel } : {})}
      />
    ),
  };
}
